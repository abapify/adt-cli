/**
 * Session Management for SAP ADT
 *
 * Handles stateful sessions with cookie management and CSRF token caching.
 * Separated into testable modules for better maintainability.
 */

import type { Logger } from '@abapify/logger';

/**
 * Cookie Store - Manages HTTP cookies for stateful sessions
 */
export class CookieStore {
  private cookies = new Map<string, string>();

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
  private etags = new Map<string, string>();

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
   * Normalize URL to use as cache key (remove query params, trailing slashes)
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/\/$/, '');
    } catch {
      // If not a full URL, just use the path
      return url.split('?')[0].replace(/\/$/, '');
    }
  }
}

/**
 * Session Manager - Orchestrates cookies and CSRF tokens
 */
export class SessionManager {
  private cookieStore = new CookieStore();
  private csrfManager = new CsrfTokenManager();
  private etagManager = new ETagManager();

  constructor(private logger?: Logger) {}

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
   * Initialize CSRF token by making a preflight request
   * Should be called before first write operation
   *
   * NOTE: This method is kept for backward compatibility and non-contract usage.
   * For contract-based usage, use the sessionsContract from adt/core/http/sessions.contract
   */
  async initializeCsrf(
    baseUrl: string,
    authHeader: string,
    client?: string,
    language?: string,
  ): Promise<boolean> {
    const url = new URL('/sap/bc/adt/core/http/sessions', baseUrl);

    if (client) {
      url.searchParams.append('sap-client', client);
    }
    if (language) {
      url.searchParams.append('sap-language', language);
    }

    const headers: Record<string, string> = {
      Authorization: authHeader,
      'x-csrf-token': 'Fetch',
      Accept: 'application/vnd.sap.adt.core.http.session.v3+xml',
      'X-sap-adt-sessiontype': 'stateful',
    };

    // Include existing cookies if any
    const cookieHeader = this.cookieStore.getCookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    try {
      this.logger?.debug('Session: Initializing CSRF token');
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        this.logger?.warn(
          `Session: CSRF initialization failed with status ${response.status}`,
        );
        return false;
      }

      // Process response to extract cookies and CSRF
      this.processResponse(response);

      const success = this.csrfManager.hasCached();
      if (success) {
        this.logger?.debug('Session: CSRF token initialized successfully');
      } else {
        this.logger?.warn(
          'Session: CSRF initialization succeeded but no token found',
        );
      }

      return success;
    } catch (error) {
      this.logger?.error(
        `Session: CSRF initialization error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Clear all session state (cookies and CSRF)
   */
  clear(): void {
    this.cookieStore.clear();
    this.csrfManager.clear();
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
