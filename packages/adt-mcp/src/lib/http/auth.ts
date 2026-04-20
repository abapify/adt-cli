/**
 * Auth middleware for the adt-mcp HTTP transport.
 *
 * Four modes:
 *   - `none`   — no authentication (dev / behind already-authenticated transport).
 *   - `bearer` — require `Authorization: Bearer <token>` where `<token>` matches
 *                the configured secret. Compared with `crypto.timingSafeEqual`.
 *   - `proxy`  — trust a reverse proxy (e.g. oauth2-proxy, Cloudflare Access).
 *                Requires a non-empty `x-forwarded-user` header. Additional
 *                identity hints (`x-forwarded-email`, `x-forwarded-groups`) are
 *                collected into the returned `userHint`.
 *   - `oauth`  — validate an OIDC-issued JWT (Okta, Entra ID, Cognito, …)
 *                against the configured issuer + audience + scopes. See
 *                `./oauth.ts` for the validator implementation.
 *
 * The middleware writes a 401 JSON response on failure and returns
 * `{ allowed: false }`. The caller should stop processing. On success it
 * returns `{ allowed: true, userHint? }`; the caller may propagate the hint
 * to tool context for audit / per-user lock tracking.
 */
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { createOAuthValidator, type OAuthOptions } from './oauth.js';

export type AuthMode = 'none' | 'bearer' | 'proxy' | 'oauth';

export interface AuthMiddlewareOptions {
  mode: AuthMode;
  /** Required when mode==='bearer'. The expected bearer token secret. */
  token?: string;
  /** Required when mode==='oauth'. OIDC issuer / audience / scopes. */
  oauth?: OAuthOptions;
  /**
   * Test-only hook: invoked synchronously whenever an OAuth request
   * successfully authenticates, with the derived user hint. Production
   * code uses the normal `userHint` return value instead.
   * @internal
   */
  onUserHint?: (hint: UserHint | undefined) => void;
}

export interface UserHint {
  user: string;
  email?: string;
  groups?: string[];
}

export interface AuthResult {
  allowed: boolean;
  userHint?: UserHint;
}

export type AuthMiddleware = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => AuthResult | Promise<AuthResult>;

function writeUnauthorized(
  res: http.ServerResponse,
  oauthError?: string,
): void {
  if (res.headersSent) {
    try {
      res.end();
    } catch {
      // ignore
    }
    return;
  }
  // RFC 6750 §3: the WWW-Authenticate challenge for bearer tokens. For
  // OAuth failures we include the standard `error` / `error_description`
  // parameters so clients can distinguish "no token", "invalid token",
  // and "insufficient scope".
  const challenge = oauthError
    ? `Bearer realm="adt-mcp", error="${oauthError.split(':')[0].trim()}", error_description="${oauthError.replace(/"/g, "'")}"`
    : 'Bearer realm="adt-mcp"';
  res.writeHead(401, {
    'Content-Type': 'application/json',
    'WWW-Authenticate': challenge,
  });
  res.end(JSON.stringify({ error: oauthError ?? 'unauthorized' }));
}

function constantTimeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // Pad the shorter buffer so both are equal length (required for
  // timingSafeEqual). Any length mismatch is still caught by the
  // final equality check.
  const len = Math.max(ab.length, bb.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  ab.copy(ap);
  bb.copy(bp);
  const eq = timingSafeEqual(ap, bp);
  return eq && ab.length === bb.length;
}

function extractBearer(req: http.IncomingMessage): string | undefined {
  const h = req.headers['authorization'];
  const value = Array.isArray(h) ? h[0] : h;
  if (!value) return undefined;
  const trimmed = value.trim();
  // Case-insensitive "Bearer" prefix check without regex to avoid ReDoS.
  if (trimmed.length < 7) return undefined;
  const prefix = trimmed.slice(0, 6);
  if (prefix.toLowerCase() !== 'bearer') return undefined;
  // Skip a single required whitespace char, then any leading whitespace.
  const rest = trimmed.slice(6);
  if (rest.length === 0) return undefined;
  const first = rest.charCodeAt(0);
  // ASCII whitespace: space, tab, LF, CR, VT, FF.
  const isWs =
    first === 0x20 ||
    first === 0x09 ||
    first === 0x0a ||
    first === 0x0d ||
    first === 0x0b ||
    first === 0x0c;
  if (!isWs) return undefined;
  const token = rest.trimStart();
  return token.length > 0 ? token : undefined;
}

function headerString(
  req: http.IncomingMessage,
  name: string,
): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Build the auth middleware for the configured mode. Throws at creation
 * time for misconfiguration (e.g. `bearer` mode with no token).
 */
export function createAuthMiddleware(
  options: AuthMiddlewareOptions,
): AuthMiddleware {
  if (options.mode === 'bearer') {
    if (!options.token || options.token.length === 0) {
      throw new Error(
        'createAuthMiddleware: bearer mode requires a non-empty token',
      );
    }
    const expected = options.token;
    return (req, res) => {
      const presented = extractBearer(req);
      if (!presented || !constantTimeEqualString(presented, expected)) {
        writeUnauthorized(res);
        return { allowed: false };
      }
      return { allowed: true };
    };
  }

  if (options.mode === 'proxy') {
    return (req, res) => {
      const user = headerString(req, 'x-forwarded-user');
      if (!user) {
        writeUnauthorized(res);
        return { allowed: false };
      }
      const email = headerString(req, 'x-forwarded-email');
      const groupsRaw = headerString(req, 'x-forwarded-groups');
      const groups = groupsRaw
        ? groupsRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      return { allowed: true, userHint: { user, email, groups } };
    };
  }

  if (options.mode === 'oauth') {
    if (!options.oauth) {
      throw new Error(
        'createAuthMiddleware: oauth mode requires an `oauth` option',
      );
    }
    const validator = createOAuthValidator(options.oauth);
    const onUserHint = options.onUserHint;
    return async (req, res) => {
      const presented = extractBearer(req);
      if (!presented) {
        writeUnauthorized(res, 'invalid_token: missing bearer token');
        return { allowed: false };
      }
      const result = await validator(presented);
      if (!result.valid) {
        // Map to RFC 6750 error codes. `insufficient_scope` must remain
        // a distinct category so the client knows the user needs a
        // re-consent, not a re-login.
        const err = result.error ?? 'invalid_token';
        writeUnauthorized(res, err);
        return { allowed: false };
      }
      if (onUserHint) onUserHint(result.userHint);
      return { allowed: true, userHint: result.userHint };
    };
  }

  // mode === 'none'
  return () => ({ allowed: true });
}
