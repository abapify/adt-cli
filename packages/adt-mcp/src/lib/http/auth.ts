/**
 * Auth middleware for the adt-mcp HTTP transport.
 *
 * Three modes:
 *   - `none`   — no authentication (dev / behind already-authenticated transport).
 *   - `bearer` — require `Authorization: Bearer <token>` where `<token>` matches
 *                the configured secret. Compared with `crypto.timingSafeEqual`.
 *   - `proxy`  — trust a reverse proxy (e.g. oauth2-proxy, Cloudflare Access).
 *                Requires a non-empty `x-forwarded-user` header. Additional
 *                identity hints (`x-forwarded-email`, `x-forwarded-groups`) are
 *                collected into the returned `userHint`.
 *
 * The middleware writes a 401 JSON response on failure and returns
 * `{ allowed: false }`. The caller should stop processing. On success it
 * returns `{ allowed: true, userHint? }`; the caller may propagate the hint
 * to tool context for audit / per-user lock tracking.
 */
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

export type AuthMode = 'none' | 'bearer' | 'proxy';

export interface AuthMiddlewareOptions {
  mode: AuthMode;
  /** Required when mode==='bearer'. The expected bearer token secret. */
  token?: string;
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
) => AuthResult;

function writeUnauthorized(res: http.ServerResponse): void {
  if (res.headersSent) {
    try {
      res.end();
    } catch {
      // ignore
    }
    return;
  }
  res.writeHead(401, {
    'Content-Type': 'application/json',
    'WWW-Authenticate': 'Bearer realm="adt-mcp"',
  });
  res.end(JSON.stringify({ error: 'unauthorized' }));
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
  const m = /^Bearer\s+(.+)$/u.exec(value.trim());
  return m ? m[1].trim() : undefined;
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

  // mode === 'none'
  return () => ({ allowed: true });
}
