/**
 * OAuth 2.1 / OIDC bearer-token validator for the adt-mcp HTTP transport.
 *
 * adt-mcp is an MCP *resource server*, not an authorization server — we
 * only **validate** JWTs issued by an external IdP (Okta, Microsoft Entra
 * ID, AWS Cognito, Keycloak, Auth0, …). We do not issue tokens ourselves.
 *
 * Validation steps (per RFC 7519 + RFC 8725 + OAuth 2.1 Section 5.2):
 *   1. Extract `Authorization: Bearer <jwt>` (caller's responsibility).
 *   2. Fetch the JWKS for the configured `issuer`:
 *        - If `jwksUri` is provided, use it directly.
 *        - Otherwise discover via `${issuer}/.well-known/openid-configuration`.
 *   3. Verify signature + `iss` + `aud` + `exp`/`nbf` (with clock skew).
 *   4. Optionally enforce `requiredScopes` against the token's
 *      `scope` (RFC 8693) or `scp` (Entra ID) claim.
 *   5. Extract a stable user identity from a configurable claim
 *      (default chain: `preferred_username` → `email` → `sub`).
 *
 * The validator is stateless from the caller's perspective but internally
 * caches the JWKS (jose's `createRemoteJWKSet`) and the OIDC discovery
 * document for one hour.
 *
 * On failure the validator returns `{ valid: false, error }` — it never
 * throws. Callers translate that into an RFC 6750 401 response.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import type { UserHint } from './auth.js';

export interface OAuthOptions {
  /** Expected `iss` claim, e.g. `https://company.okta.com/oauth2/default`. */
  issuer: string;
  /** Expected `aud` claim(s). Strongly recommended. */
  audience?: string | string[];
  /** Explicit JWKS endpoint; falls back to OIDC discovery when absent. */
  jwksUri?: string;
  /**
   * Scopes that must be present in the token's `scope`/`scp` claim. All
   * listed scopes are required (AND).
   */
  requiredScopes?: string[];
  /** Clock skew tolerance in seconds. Default 5. */
  clockTolerance?: number;
  /**
   * Primary claim to use as the user identity. When absent the validator
   * falls back to `preferred_username` → `email` → `sub`.
   */
  userClaim?: string;
  /** Claim to read as the user email. Default `email`. */
  emailClaim?: string;
  /** Claim to read as the groups array. Default `groups`. */
  groupsClaim?: string;
}

export interface OAuthValidationResult {
  valid: boolean;
  claims?: JWTPayload;
  userHint?: UserHint;
  error?: string;
}

export type OAuthValidator = (token: string) => Promise<OAuthValidationResult>;

interface DiscoveryDoc {
  issuer?: string;
  jwks_uri?: string;
  [key: string]: unknown;
}

const DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1 hour

interface DiscoveryCacheEntry {
  fetchedAt: number;
  doc: DiscoveryDoc;
}

const discoveryCache = new Map<string, DiscoveryCacheEntry>();

function trimTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

async function fetchDiscovery(issuer: string): Promise<DiscoveryDoc> {
  const now = Date.now();
  const cached = discoveryCache.get(issuer);
  if (cached && now - cached.fetchedAt < DISCOVERY_TTL_MS) {
    return cached.doc;
  }
  const url = `${trimTrailingSlash(issuer)}/.well-known/openid-configuration`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(
      `OIDC discovery failed for ${issuer}: HTTP ${res.status} ${res.statusText}`,
    );
  }
  const doc = (await res.json()) as DiscoveryDoc;
  if (!doc.jwks_uri || typeof doc.jwks_uri !== 'string') {
    throw new Error(
      `OIDC discovery document for ${issuer} is missing jwks_uri`,
    );
  }
  discoveryCache.set(issuer, { fetchedAt: now, doc });
  return doc;
}

/**
 * Extract the list of scopes from a token payload. Supports both the
 * OAuth 2.0 `scope` string claim (space-delimited) and the Entra ID
 * `scp` claim (string or array).
 */
function extractScopes(claims: JWTPayload): string[] {
  const scope = (claims as Record<string, unknown>)['scope'];
  const scp = (claims as Record<string, unknown>)['scp'];
  const parts: string[] = [];
  if (typeof scope === 'string') {
    parts.push(
      ...scope
        .split(' ')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );
  }
  if (typeof scp === 'string') {
    parts.push(
      ...scp
        .split(' ')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );
  } else if (Array.isArray(scp)) {
    for (const v of scp) {
      if (typeof v === 'string' && v.length > 0) parts.push(v);
    }
  }
  return parts;
}

function extractUserHint(
  claims: JWTPayload,
  userClaim: string | undefined,
  emailClaim: string,
  groupsClaim: string,
): UserHint | undefined {
  const record = claims as Record<string, unknown>;
  let user: string | undefined;
  if (userClaim) {
    const v = record[userClaim];
    if (typeof v === 'string' && v.length > 0) user = v;
  }
  if (!user) {
    for (const c of ['preferred_username', 'email', 'sub']) {
      const v = record[c];
      if (typeof v === 'string' && v.length > 0) {
        user = v;
        break;
      }
    }
  }
  if (!user) return undefined;

  const emailRaw = record[emailClaim];
  const email = typeof emailRaw === 'string' ? emailRaw : undefined;

  const groupsRaw = record[groupsClaim];
  let groups: string[] | undefined;
  if (Array.isArray(groupsRaw)) {
    groups = groupsRaw.filter((v): v is string => typeof v === 'string');
  } else if (typeof groupsRaw === 'string' && groupsRaw.length > 0) {
    groups = groupsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return { user, email, groups };
}

/**
 * Build an OAuth/JWT validator for the configured issuer. Throws
 * synchronously on invalid options (e.g. missing issuer).
 */
export function createOAuthValidator(opts: OAuthOptions): OAuthValidator {
  if (!opts.issuer || opts.issuer.length === 0) {
    throw new Error('createOAuthValidator: `issuer` is required');
  }
  const issuer = opts.issuer;
  const audience = opts.audience;
  const requiredScopes = opts.requiredScopes ?? [];
  const clockTolerance = opts.clockTolerance ?? 5;
  const userClaim = opts.userClaim;
  const emailClaim = opts.emailClaim ?? 'email';
  const groupsClaim = opts.groupsClaim ?? 'groups';

  // JWKS URL may be known up-front (explicit config) or resolved lazily
  // from the discovery document. We cache the `createRemoteJWKSet` result
  // per URL so jose's internal key cache is reused across calls.
  let staticJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
  if (opts.jwksUri) {
    staticJwks = createRemoteJWKSet(new URL(opts.jwksUri));
  }

  const resolvedJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

  async function getJwks(): Promise<ReturnType<typeof createRemoteJWKSet>> {
    if (staticJwks) return staticJwks;
    const doc = await fetchDiscovery(issuer);
    const uri = doc.jwks_uri as string;
    let jwks = resolvedJwks.get(uri);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(uri));
      resolvedJwks.set(uri, jwks);
    }
    return jwks;
  }

  return async (token: string): Promise<OAuthValidationResult> => {
    if (!token || token.length === 0) {
      return { valid: false, error: 'missing_token' };
    }

    let jwks: ReturnType<typeof createRemoteJWKSet>;
    try {
      jwks = await getJwks();
    } catch (err) {
      return {
        valid: false,
        error: `discovery_failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }

    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(token, jwks, {
        issuer,
        audience,
        clockTolerance,
      });
      payload = verified.payload;
    } catch (err) {
      return {
        valid: false,
        error: `invalid_token: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }

    if (requiredScopes.length > 0) {
      const scopes = new Set(extractScopes(payload));
      const missing = requiredScopes.filter((s) => !scopes.has(s));
      if (missing.length > 0) {
        return {
          valid: false,
          claims: payload,
          error: `insufficient_scope: missing ${missing.join(', ')}`,
        };
      }
    }

    const userHint = extractUserHint(
      payload,
      userClaim,
      emailClaim,
      groupsClaim,
    );

    return { valid: true, claims: payload, userHint };
  };
}

/**
 * Test-only helper: reset the discovery cache. Not part of the public API.
 * @internal
 */
export function __resetOAuthDiscoveryCacheForTests(): void {
  discoveryCache.clear();
}
