/**
 * Puppeteer Authentication Plugin
 *
 * Thin wrapper around @abapify/browser-auth core.
 * Provides Puppeteer-specific browser adapter.
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
import { createPuppeteerAdapter } from './adapter';

// Re-export types with Puppeteer-specific names for backwards compatibility
export type PuppeteerCredentials = BrowserCredentials;
export type PuppeteerAuthOptions = BrowserAuthOptions;

/**
 * Puppeteer authentication object
 */
export const puppeteerAuth = {
  /**
   * Authenticate using Puppeteer browser
   */
  async authenticate(
    options: PuppeteerAuthOptions,
  ): Promise<PuppeteerCredentials> {
    const adapter = createPuppeteerAdapter();
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
  }): Promise<PuppeteerCredentials | null> {
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
export const puppeteer = puppeteerAuth;
