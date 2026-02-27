/**
 * @abapify/browser-auth
 *
 * Browser-based SSO authentication core.
 * Shared logic for Playwright and Puppeteer adapters.
 */

// Core authentication
export {
  authenticate,
  testCredentials,
  toCookieHeader,
  toHeaders,
} from './auth-core';
export type { AuthenticateOptions } from './auth-core';

// Types
export type {
  CookieData,
  BrowserCredentials,
  BrowserAuthOptions,
  BrowserAdapter,
  ResponseEvent,
  TestResult,
} from './types';

// Utilities
export {
  matchesCookiePattern,
  cookieMatchesAny,
  resolveUserDataDir,
} from './utils';
