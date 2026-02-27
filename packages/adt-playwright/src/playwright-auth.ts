/**
 * Playwright Authentication Plugin
 *
 * Thin wrapper around @abapify/browser-auth core.
 * Provides Playwright-specific browser adapter.
 */

import {
  authenticate,
  testCredentials,
  toCookieHeader,
  toHeaders,
} from '@abapify/browser-auth';
import type {
  BrowserCredentials,
  BrowserAuthOptions,
} from '@abapify/browser-auth';
import { createPlaywrightAdapter } from './adapter';

// Re-export types with Playwright-specific names for backwards compatibility
export type PlaywrightCredentials = BrowserCredentials;
export type PlaywrightAuthOptions = BrowserAuthOptions;

/**
 * Playwright authentication object
 */
export const playwrightAuth = {
  /**
   * Authenticate using Playwright browser
   */
  async authenticate(
    options: PlaywrightAuthOptions,
  ): Promise<PlaywrightCredentials> {
    const adapter = createPlaywrightAdapter();
    return authenticate(adapter, options);
  },

  /**
   * Test if credentials are still valid
   */
  test: testCredentials,

  /**
   * Refresh is not reliable with Okta SSO - always return null to trigger full re-authentication
   */
  async refresh(session: {
    auth?: { pluginOptions?: { log?: (message: string) => void } };
  }): Promise<PlaywrightCredentials | null> {
    const log = session?.auth?.pluginOptions?.log as
      | ((message: string) => void)
      | undefined;
    (log ?? console.log)(
      '🔄 Session expired, will trigger full re-authentication...',
    );
    return null;
  },
};

// Re-export utilities
export { toCookieHeader, toHeaders };

// Legacy export
export const playwright = playwrightAuth;
