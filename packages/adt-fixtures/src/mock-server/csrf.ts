/**
 * CSRF / security-session state for the mock ADT server.
 *
 * Two modes:
 *  - Non-strict (default): always return a stable CSRF token on every response.
 *    Back-compatible with existing MCP integration tests.
 *  - Strict (`strictSession: true`): enforces the Eclipse ADT 3-step
 *    security-session protocol (see packages/adt-client/AGENTS.md).
 *      1. GET /sessions + x-sap-security-session: create → session URL
 *      2. GET /sessions + x-sap-security-session: use + x-csrf-token: Fetch
 *      3. DELETE /sessions/<id> → token survives; session slot freed
 */

import { randomBytes } from 'node:crypto';

export interface CsrfOptions {
  /**
   * Enforce the 3-step security session protocol.
   * Defaults to false for back-compatibility with existing tests.
   */
  strictSession?: boolean;
}

export interface CsrfState {
  token: string;
  sessionId: string | undefined;
  sessionCreated: boolean;
  tokenIssued: boolean;
  sessionDeleted: boolean;
  options: CsrfOptions;
}

export function createCsrfState(options: CsrfOptions = {}): CsrfState {
  return {
    token: randomBytes(16).toString('hex'),
    sessionId: undefined,
    sessionCreated: false,
    tokenIssued: false,
    sessionDeleted: false,
    options,
  };
}

/**
 * Apply CSRF/session headers to a response based on the incoming request.
 *
 * Returns the headers map that should be merged into the outgoing response.
 * In strict mode, also mutates `state` to track the protocol progression.
 */
export function applyCsrfHeaders(
  state: CsrfState,
  req: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  },
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!state.options.strictSession) {
    // Non-strict: always echo the CSRF token so write ops work.
    headers['x-csrf-token'] = state.token;
    return headers;
  }

  // ── strict mode ──────────────────────────────────────────────────────────
  const secSession = (req.headers['x-sap-security-session'] ?? '') as string;
  const csrfHeader = (req.headers['x-csrf-token'] ?? '') as string;
  const isSessions = req.url.startsWith('/sap/bc/adt/core/http/sessions');

  // Step 1: GET /sessions + create
  if (req.method === 'GET' && isSessions && secSession === 'create') {
    state.sessionId = randomBytes(16).toString('hex').toUpperCase();
    state.sessionCreated = true;
    // Session URL is embedded in the response body; headers are otherwise minimal.
    return headers;
  }

  // Step 2: GET /sessions + use + Fetch → issue token
  if (
    req.method === 'GET' &&
    isSessions &&
    secSession === 'use' &&
    csrfHeader.toLowerCase() === 'fetch'
  ) {
    if (!state.sessionCreated) {
      // Protocol violation — return without CSRF to force failure upstream.
      return headers;
    }
    headers['x-csrf-token'] = state.token;
    state.tokenIssued = true;
    return headers;
  }

  // Step 3: DELETE /sessions/<id>
  if (req.method === 'DELETE' && isSessions) {
    state.sessionDeleted = true;
    headers['x-csrf-token'] = state.token;
    return headers;
  }

  // Subsequent requests: must carry x-sap-security-session: use and a valid
  // CSRF token on write operations. For reads we echo the token so it can be
  // re-fetched if needed.
  headers['x-csrf-token'] = state.token;
  return headers;
}
