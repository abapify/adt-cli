/**
 * Browser Auth Core Types
 *
 * Shared types for browser-based SSO authentication.
 * Used by both Playwright and Puppeteer adapters.
 */

/**
 * Cookie data structure (browser-agnostic)
 */
export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Browser authentication credentials
 */
export interface BrowserCredentials {
  /** SAP system base URL */
  baseUrl: string;
  /** Cookies from authenticated session */
  cookies: CookieData[];
  /** When the session was created */
  authenticatedAt: Date;
  /** User agent used during authentication */
  userAgent?: string;
}

/**
 * Browser auth configuration options
 */
export interface BrowserAuthOptions {
  /** SAP system URL */
  url: string;
  /** Show browser window during login (default: false) */
  headless?: boolean;
  /** Timeout for login in ms (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Custom user agent */
  userAgent?: string;
  /**
   * Cookie names/patterns to wait for before completing auth.
   * Supports wildcards: 'SAP_SESSIONID_*'
   * Auth completes when ALL patterns are matched.
   */
  requiredCookies?: string[];
  /** Path to persistent browser profile */
  userDataDir?: string | boolean;
  /** Ignore HTTPS errors (self-signed certificates) */
  ignoreHTTPSErrors?: boolean;
}

/**
 * Response event data from browser adapter
 */
export interface ResponseEvent {
  url: string;
  status: number;
}

/**
 * Browser adapter interface - implemented by Playwright/Puppeteer wrappers
 */
export interface BrowserAdapter {
  /**
   * Launch browser and create context
   */
  launch(options: {
    headless: boolean;
    userDataDir?: string;
    ignoreHTTPSErrors?: boolean;
    userAgent?: string;
  }): Promise<void>;

  /**
   * Create a new page
   */
  newPage(): Promise<void>;

  /**
   * Navigate to URL
   */
  goto(url: string, options?: { timeout?: number }): Promise<void>;

  /**
   * Get all cookies for a domain
   */
  getCookies(): Promise<CookieData[]>;

  /**
   * Clear cookies matching a domain pattern
   */
  clearCookies(domain: string): Promise<void>;

  /**
   * Get user agent string
   */
  getUserAgent(): Promise<string>;

  /**
   * Close the page
   */
  closePage(): Promise<void>;

  /**
   * Close browser context
   */
  close(): Promise<void>;

  /**
   * Register event handler for responses
   */
  onResponse(handler: (event: ResponseEvent) => void): void;

  /**
   * Register event handler for page close
   */
  onPageClose(handler: () => void): void;
}

/**
 * Test result for credential validation
 */
export interface TestResult {
  valid: boolean;
  error?: string;
  responseTime?: number;
}
