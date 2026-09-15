/**
 * Session Management for SAP ADT
 *
 * Handles stateful sessions with cookie management and CSRF token caching.
 * Separated into testable modules for better maintainability.
 */

import type { Logger } from '@abapify/logger';

/**
 * Fetch function injected into SessionManager so the adapter can route
 * CSRF handshake requests through the same Undici dispatcher (and
 * headersTimeout) used for the final adapter request. Defaults to the
 * global fetch when no dispatcher is configured.
 */
export type SessionFetchFn = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Cookie Store - Manages HTTP cookies for stateful sessions
 */
export class CookieStore {
  private readonly cookies = new Map<string, string>();

  /**
   * Parse Set-Cookie header and store cookies
   * Handles complex cookie strings with expires dates
   */
  parseCookies(setCookieHeader: string): void {
    const cookieStrings = this.splitCookieHeader(setCookieHeader);

    for (const cookieString of cookieStrings) {
      // Extract name=value pair (first part before semicolon)
      const nameValuePart = cookieString.split(';')[0].trim();
      const [name, value] = nameValuePart.split('=', 2);

      // Store only valid cookies (ignore metadata like expires, path)
      if (
        name &&
        value &&
        !name.includes('expires') &&
        !name.includes('path')
      ) {
        this.cookies.set(name.trim(), value.trim());
      }
    }
  }

  /**
   * Split Set-Cookie header by commas, avoiding splitting on expires dates
   */
  private splitCookieHeader(setCookieHeader: string): string[] {
    const cookies: string[] = [];
    let current = '';
    let inExpires = false;

    for (let i = 0; i < setCookieHeader.length; i++) {
      const char = setCookieHeader[i];

      if (char === ',' && !inExpires) {
        if (current.trim()) {
          cookies.push(current.trim());
        }
        current = '';
      } else {
        current += char;

        // Track if we're inside an expires attribute
        if (current.toLowerCase().includes('expires=')) {
          inExpires = true;
        }

        // End of expires when we hit semicolon or end
        if (inExpires && (char === ';' || i === setCookieHeader.length - 1)) {
          inExpires = false;
        }
      }
    }

    if (current.trim()) {
      cookies.push(current.trim());
    }

    return cookies;
  }

  /**
   * Get Cookie header value for requests
   */
  getCookieHeader(): string | undefined {
    if (this.cookies.size === 0) {
      return undefined;
    }

    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Check if we have any cookies
   */
  hasCookies(): boolean {
    return this.cookies.size > 0;
  }

  /**
   * Clear all cookies
   */
  clear(): void {
    this.cookies.clear();
  }

  /**
   * Get all cookies as a map (for testing/debugging)
   */
  getAll(): Map<string, string> {
    return new Map(this.cookies);
  }

  /**
   * Inject pre-existing cookies (e.g., from SAML authentication)
   * @param cookieString Cookie string in "name=value; name2=value2" format
   */
  injectCookie(cookieString: string): void {
    // Split by "; " to handle multiple cookies
    const cookies = cookieString.split('; ');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.split('=');
      const value = valueParts.join('='); // Handle values containing '='
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
      }
    }
  }
}

/**
 * CSRF Token Manager - Handles CSRF token caching and initialization
 */
export class CsrfTokenManager {
  private cachedToken?: string;

  /**
   * Extract CSRF token from cookies (SAP stores it there)
   */
  extractFromCookies(cookies: Map<string, string>): string | undefined {
    // Find CSRF/XSRF cookie
    const xsrfEntry = Array.from(cookies.entries()).find(
      ([key]) =>
        key.toLowerCase().includes('xsrf') ||
        key.toLowerCase().includes('csrf'),
    );

    if (!xsrfEntry) {
      return undefined;
    }

    // Decode cookie value
    const cookieValue = xsrfEntry[1];
    const decodedToken = decodeURIComponent(cookieValue);

    // Extract just the token part (before timestamp if present)
    const tokenMatch = decodedToken.match(/^([A-Za-z0-9+/_-]+=*)/);
    const actualToken = tokenMatch ? tokenMatch[1] : decodedToken;

    // Validate token (ignore placeholder values)
    if (
      actualToken &&
      actualToken !== 'Required' &&
      actualToken !== 'fetch' &&
      actualToken !== 'Fetch'
    ) {
      return actualToken;
    }

    return undefined;
  }

  /**
   * Extract CSRF token from response header
   */
  extractFromHeader(headerValue: string | null): string | undefined {
    if (
      !headerValue ||
      headerValue === 'Required' ||
      headerValue === 'fetch' ||
      headerValue === 'Fetch'
    ) {
      return undefined;
    }

    return headerValue;
  }

  /**
   * Cache a CSRF token
   */
  cache(token: string): void {
    this.cachedToken = token;
  }

  /**
   * Get cached CSRF token
   */
  getCached(): string | undefined {
    return this.cachedToken;
  }

  /**
   * Clear cached CSRF token (e.g., on 403 errors)
   */
  clear(): void {
    this.cachedToken = undefined;
  }

  /**
   * Check if we have a cached token
   */
  hasCached(): boolean {
    return !!this.cachedToken;
  }

  /**
   * Alias for hasCached() - for consistency with SessionManager API
   */
  hasToken(): boolean {
    return this.hasCached();
  }
}

/**
 * ETag Manager - Tracks ETags for optimistic locking
 */
export class ETagManager {
  private readonly etags = new Map<string, string>();

  /**
   * Extract and cache ETag from response header
   * @param url The request URL (used as key)
   * @param headerValue The ETag header value
   */
  cacheFromHeader(url: string, headerValue: string | null): void {
    if (headerValue) {
      // Normalize URL to just the path (remove query params)
      const key = this.normalizeUrl(url);
      this.etags.set(key, headerValue);
    }
  }

  /**
   * Get cached ETag for a URL
   */
  get(url: string): string | undefined {
    const key = this.normalizeUrl(url);
    return this.etags.get(key);
  }

  /**
   * Clear cached ETag for a URL
   */
  clear(url?: string): void {
    if (url) {
      const key = this.normalizeUrl(url);
      this.etags.delete(key);
    } else {
      this.etags.clear();
    }
  }

  /**
   * Normalize URL to use as cache key.
   * Removes query params, trailing slashes, and lowercases the path.
   * SAP ADT URLs are case-insensitive, so /fmodules/ZAGE_FM and
   * /fmodules/zage_fm must share the same ETag cache entry.
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      // If not a full URL, just use the path
      return url.split('?')[0].replace(/\/$/, '').toLowerCase();
    }
  }
}

/**
 * Session Manager - Orchestrates cookies and CSRF tokens
 */
export class SessionManager {
  private static readonly SESSION_PATH_PREFIX =
    '/sap/bc/adt/core/http/sessions/';

  private readonly cookieStore = new CookieStore();
  private readonly csrfManager = new CsrfTokenManager();
  private readonly etagManager = new ETagManager();
  private securitySessionActive = false;

  constructor(
    private readonly logger?: Logger,
    private readonly fetchFn: SessionFetchFn = globalThis.fetch,
  ) {}

  /**
   * Process response to update session state
   * Extracts cookies, CSRF tokens, and ETags
   * @param response The HTTP response
   * @param url Optional URL for ETag caching (required for ETag tracking)
   */
  processResponse(response: Response, url?: string): void {
    // Cache ETag for optimistic locking
    if (url) {
      const etag = response.headers.get('etag');
      if (etag) {
        this.etagManager.cacheFromHeader(url, etag);
        this.logger?.debug(`Session: ETag cached for ${url}: ${etag}`);
      }
    }

    // Update cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      this.cookieStore.parseCookies(setCookieHeader);
      this.logger?.debug('Session: Cookies updated from response');
    }

    // Try to extract and cache CSRF token from header
    const csrfHeader = response.headers.get('x-csrf-token');
    const csrfToken = this.csrfManager.extractFromHeader(csrfHeader);
    if (csrfToken) {
      this.csrfManager.cache(csrfToken);
      this.logger?.debug('Session: CSRF token cached from header');
    }

    // Try to extract CSRF from cookies if not in header
    if (!csrfToken && this.cookieStore.hasCookies()) {
      const cookieCsrf = this.csrfManager.extractFromCookies(
        this.cookieStore.getAll(),
      );
      if (cookieCsrf) {
        this.csrfManager.cache(cookieCsrf);
        this.logger?.debug('Session: CSRF token cached from cookies');
      }
    }
  }

  /**
   * Get headers for next request
   * @param method HTTP method
   * @param url Optional URL for ETag lookup (for PUT/PATCH with optimistic locking)
   */
  getRequestHeaders(method: string, url?: string): Record<string, string> {
    const headers: Record<string, string> = {};

    // Reuse the security session for all requests after creation
    if (this.securitySessionActive) {
      headers['x-sap-security-session'] = 'use';
    }

    // Add cookies if we have any
    const cookieHeader = this.cookieStore.getCookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    // Add CSRF token for write operations
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      method.toUpperCase(),
    );
    if (needsCsrf) {
      const cachedToken = this.csrfManager.getCached();
      if (cachedToken) {
        headers['x-csrf-token'] = cachedToken;
      } else {
        // Request CSRF token if we don't have one
        headers['x-csrf-token'] = 'Fetch';
      }
    }

    // Add If-Match header for PUT/PATCH if we have a cached ETag
    const needsEtag = ['PUT', 'PATCH'].includes(method.toUpperCase());
    if (needsEtag && url) {
      const etag = this.etagManager.get(url);
      if (etag) {
        headers['If-Match'] = etag;
        this.logger?.debug(`Session: Using cached ETag for If-Match: ${etag}`);
      }
    }

    return headers;
  }

  /**
   * Get cached ETag for a URL
   */
  getETag(url: string): string | undefined {
    return this.etagManager.get(url);
  }

  /**
   * Clear cached ETag for a URL
   */
  clearETag(url?: string): void {
    this.etagManager.clear(url);
  }

  /**
   * Reject session paths that could send cleanup requests off-target.
   * Only relative paths under the ADT sessions endpoint (or same-origin
   * absolute URLs with that path) are accepted.
   */
  private isTrustedSessionPath({
    baseUrl,
    sessionPath,
  }: {
    baseUrl: string;
    sessionPath: string;
  }): boolean {
    try {
      const parsed = new URL(sessionPath, baseUrl);
      const base = new URL(baseUrl);
      return (
        parsed.origin === base.origin &&
        parsed.pathname.startsWith(SessionManager.SESSION_PATH_PREFIX)
      );
    } catch {
      return false;
    }
  }

  private extractTrustedSessionPath({
    baseUrl,
    body,
  }: {
    baseUrl: string;
    body: string;
  }): string | undefined {
    const match = body.match(/href="([^"]*\/sessions\/[^"]*)"/);
    const sessionPath = match?.[1];
    if (!sessionPath || !this.isTrustedSessionPath({ baseUrl, sessionPath })) {
      this.logger?.warn(
        'Session: Created security session returned an untrusted path',
      );
      return undefined;
    }
    return sessionPath;
  }

  /**
   * Initialize CSRF token using the Eclipse ADT security session flow:
   *
   * 1. GET /sessions + x-sap-security-session: create  → create security session
   * 2. GET /sessions + x-sap-security-session: use + x-csrf-token: Fetch → get CSRF token
   * 3. DELETE /sessions/<id> + x-sap-security-session: use + x-csrf-token → destroy session
   *
   * The CSRF token survives the session deletion and remains valid for
   * all subsequent lock/unlock operations. Deleting the session frees
   * the slot — SAP allows only one security session per user.
   */
  private resolveInitializeCsrfArgs(...args: unknown[]): {
    authHeader?: string;
    client?: string;
    language?: string;
    signal?: AbortSignal;
  } {
    if (args.length === 1) {
      const first = args[0];
      if (first !== null) {
        if (typeof first === 'object') {
          return first as {
            authHeader?: string;
            client?: string;
            language?: string;
            signal?: AbortSignal;
          };
        }
      }
    }
    return {
      authHeader: typeof args[0] === 'string' ? args[0] : undefined,
      client: typeof args[1] === 'string' ? args[1] : undefined,
      language: typeof args[2] === 'string' ? args[2] : undefined,
      signal: args[3] instanceof AbortSignal ? args[3] : undefined,
    };
  }

  async initializeCsrf(
    baseUrl: string,
    authHeader?: string,
    client?: string,
    language?: string,
    signal?: AbortSignal,
  ): Promise<boolean>;
  async initializeCsrf(
    baseUrl: string,
    options?: {
      authHeader?: string;
      client?: string;
      language?: string;
      signal?: AbortSignal;
    },
  ): Promise<boolean>;
  async initializeCsrf(baseUrl: string, ...args: unknown[]): Promise<boolean> {
    const { authHeader, client, language, signal } =
      this.resolveInitializeCsrfArgs(...args);

    signal?.throwIfAborted();
    const sessionsUrl = this.buildSessionsUrl(baseUrl, client, language);
    let sessionPath: string | undefined;

    try {
      sessionPath = await this.createSecuritySession(
        baseUrl,
        sessionsUrl,
        authHeader,
        signal,
      );
      if (!sessionPath) return false;
      if (!(await this.acquireCsrfToken(sessionsUrl, authHeader, signal))) {
        this.deleteSecuritySessionWithFallback({
          sessionPath,
          baseUrl,
          authHeader,
          client,
          language,
        }).catch(() => undefined);
        return false;
      }

      const acquiredCsrfToken = this.csrfManager.getCached();
      if (acquiredCsrfToken) {
        await this.deleteSecuritySession({
          sessionPath,
          csrfToken: acquiredCsrfToken,
          baseUrl,
          authHeader,
          client,
          signal,
        });
      }
      signal?.throwIfAborted();

      return true;
    } catch (error) {
      return this.handleCsrfInitializationError(error, {
        baseUrl,
        authHeader,
        client,
        language,
        sessionPath,
        signal,
      });
    }
  }

  private buildSessionsUrl(
    baseUrl: string,
    client?: string,
    language?: string,
  ): URL {
    const url = new URL('/sap/bc/adt/core/http/sessions', baseUrl);
    if (client) url.searchParams.append('sap-client', client);
    if (language) url.searchParams.append('sap-language', language);
    return url;
  }

  private buildSessionHeaders(authHeader?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.sap.adt.core.http.session.v3+xml',
      'X-sap-adt-sessiontype': 'stateful',
    };
    if (authHeader) headers.Authorization = authHeader;
    const cookie = this.cookieStore.getCookieHeader();
    if (cookie) headers.Cookie = cookie;
    return headers;
  }

  private async createSecuritySession(
    baseUrl: string,
    sessionsUrl: URL,
    authHeader?: string,
    signal?: AbortSignal,
  ): Promise<string | undefined> {
    this.logger?.debug('Session: Creating security session');
    // nosemgrep
    const response = await this.fetchFn(sessionsUrl, {
      method: 'GET',
      headers: {
        ...this.buildSessionHeaders(authHeader),
        'x-sap-security-session': 'create',
      },
      signal,
    });
    signal?.throwIfAborted();

    if (!response.ok) {
      this.logger?.warn(
        `Session: Security session creation failed with status ${response.status}`,
      );
      return undefined;
    }
    this.processResponse(response);

    const body = await response.text();
    signal?.throwIfAborted();
    return this.extractTrustedSessionPath({ baseUrl, body });
  }

  private async acquireCsrfToken(
    sessionsUrl: URL,
    authHeader?: string,
    signal?: AbortSignal,
  ): Promise<boolean> {
    this.logger?.debug('Session: Fetching CSRF token');
    // nosemgrep
    const response = await this.fetchFn(sessionsUrl, {
      method: 'GET',
      headers: {
        ...this.buildSessionHeaders(authHeader),
        'x-sap-security-session': 'use',
        'x-csrf-token': 'Fetch',
      },
      signal,
    });
    signal?.throwIfAborted();

    if (!response.ok) {
      this.logger?.warn(
        `Session: CSRF fetch failed with status ${response.status}`,
      );
      return false;
    }
    this.processResponse(response);

    if (!this.csrfManager.hasCached()) {
      this.logger?.warn(
        'Session: CSRF fetch succeeded but no token found in response',
      );
      return false;
    }

    this.securitySessionActive = true;
    this.logger?.debug('Session: CSRF token acquired');
    return true;
  }

  private async deleteSecuritySession({
    sessionPath,
    csrfToken,
    baseUrl,
    authHeader,
    client,
    signal,
  }: {
    sessionPath: string;
    csrfToken: string;
    baseUrl: string;
    authHeader?: string;
    client?: string;
    signal?: AbortSignal;
  }): Promise<void> {
    if (!this.isTrustedSessionPath({ baseUrl, sessionPath })) {
      this.logger?.warn(
        'Session: Refusing to delete security session with untrusted path',
      );
      return;
    }
    const deleteUrl = new URL(sessionPath, baseUrl);
    if (client) deleteUrl.searchParams.append('sap-client', client);
    try {
      this.logger?.debug(`Session: Deleting security session ${sessionPath}`);
      // nosemgrep
      await this.fetchFn(deleteUrl, {
        method: 'DELETE',
        headers: {
          ...this.buildSessionHeaders(authHeader),
          'x-sap-security-session': 'use',
          'x-csrf-token': csrfToken,
        },
        signal: signal ?? AbortSignal.timeout(5_000),
      });
      this.logger?.debug('Session: Security session deleted');
    } catch {
      this.logger?.debug(
        'Session: Failed to delete security session (will expire)',
      );
    }
  }

  private async fetchSecuritySessionCsrfToken({
    baseUrl,
    authHeader,
    client,
    language,
    signal,
  }: {
    baseUrl: string;
    authHeader?: string;
    client?: string;
    language?: string;
    signal?: AbortSignal;
  }): Promise<string | undefined> {
    const sessionsUrl = this.buildSessionsUrl(baseUrl, client, language);
    try {
      this.logger?.debug(
        'Session: Fetching CSRF token for security session cleanup',
      );
      // nosemgrep
      const response = await this.fetchFn(sessionsUrl, {
        method: 'GET',
        headers: {
          ...this.buildSessionHeaders(authHeader),
          'x-sap-security-session': 'use',
          'x-csrf-token': 'Fetch',
        },
        signal: signal ?? AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        this.logger?.debug(
          `Session: Cleanup CSRF fetch failed with status ${response.status}`,
        );
        return undefined;
      }
      // Parse Set-Cookie for the cleanup session, but do not cache the
      // CSRF token or mark the session active — cleanup must not pollute
      // shared state that later requests rely on.
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) this.cookieStore.parseCookies(setCookieHeader);
      return this.csrfManager.extractFromHeader(
        response.headers.get('x-csrf-token'),
      );
    } catch {
      this.logger?.debug('Session: Failed to fetch cleanup CSRF token');
      return undefined;
    }
  }

  private async deleteSecuritySessionWithFallback({
    sessionPath,
    baseUrl,
    authHeader,
    client,
    language,
    signal,
  }: {
    sessionPath: string;
    baseUrl: string;
    authHeader?: string;
    client?: string;
    language?: string;
    signal?: AbortSignal;
  }): Promise<void> {
    // Always fetch a fresh cleanup token; the shared cache may contain a
    // stale value and cleanup must never pollute shared CSRF/session state.
    const token = await this.fetchSecuritySessionCsrfToken({
      baseUrl,
      authHeader,
      client,
      language,
      signal,
    });
    if (token) {
      await this.deleteSecuritySession({
        sessionPath,
        csrfToken: token,
        baseUrl,
        authHeader,
        client,
        signal,
      });
    }
  }

  private handleCsrfInitializationError(
    error: unknown,
    {
      baseUrl,
      authHeader,
      client,
      language,
      sessionPath,
      signal,
    }: {
      baseUrl: string;
      authHeader?: string;
      client?: string;
      language?: string;
      sessionPath?: string;
      signal?: AbortSignal;
    },
  ): boolean {
    if (sessionPath) {
      // Use a detached timeout for cleanup; the caller signal may already
      // be aborted and we still want to free the SAP session slot.
      this.deleteSecuritySessionWithFallback({
        sessionPath,
        baseUrl,
        authHeader,
        client,
        language,
      }).catch(() => undefined);
    }
    if (signal?.aborted) {
      throw error;
    }
    this.logger?.error(
      `Session: CSRF initialization error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }

  /**
   * Clear all session state (cookies and CSRF)
   */
  clear(): void {
    this.cookieStore.clear();
    this.csrfManager.clear();
    this.securitySessionActive = false;
    this.logger?.debug('Session: Cleared all session state (cookies and CSRF)');
  }

  /**
   * Check if we have a cached CSRF token
   */
  hasCsrfToken(): boolean {
    return this.csrfManager.hasCached();
  }

  /**
   * Get Cookie header value for requests
   */
  getCookieHeader(): string | undefined {
    return this.cookieStore.getCookieHeader();
  }

  /**
   * Get session type header value
   * SAP ADT requires 'stateful' for operations that need session persistence
   */
  getSessionTypeHeader(): string {
    return 'stateful';
  }

  /**
   * Inject a pre-existing cookie (e.g., from SAML authentication)
   * @param cookieString Cookie string in "name=value" format
   */
  injectCookie(cookieString: string): void {
    this.cookieStore.injectCookie(cookieString);
    this.logger?.debug(`Session: Injected cookie from external source`);
  }
}
