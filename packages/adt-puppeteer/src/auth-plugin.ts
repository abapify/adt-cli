/**
 * Standard authPlugin export for AuthManager compatibility
 *
 * Wraps puppeteerAuth to return AuthPluginResult format expected by AuthManager.
 */

import type {
  AuthPlugin,
  AuthPluginResult,
  AuthPluginOptions,
  AuthSession,
} from '@abapify/adt-auth';
import { puppeteerAuth, toCookieHeader } from './puppeteer-auth';

/**
 * Get earliest expiration from cookies, or default to 8 hours
 */
function getExpiresAt(cookies: { expires?: number }[]): Date {
  const expirations = cookies
    .filter((c) => c.expires && c.expires > 0)
    .map((c) => c.expires! * 1000); // Convert seconds to ms

  if (expirations.length > 0) {
    return new Date(Math.min(...expirations));
  }
  // Default fallback if no expiration set
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

/**
 * Standard auth plugin that conforms to AuthPluginResult interface.
 */
const authPlugin: AuthPlugin = {
  async authenticate(options: AuthPluginOptions): Promise<AuthPluginResult> {
    const credentials = await puppeteerAuth.authenticate(options);
    const cookieString = toCookieHeader(credentials);

    return {
      method: 'cookie',
      credentials: {
        cookies: cookieString,
        expiresAt: getExpiresAt(credentials.cookies),
      },
    };
  },

  async refresh(_session: AuthSession): Promise<AuthPluginResult | null> {
    // Don't try to refresh - Okta SSO cookies can't be silently refreshed
    return null;
  },
};

export default authPlugin;
