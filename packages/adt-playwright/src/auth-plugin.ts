/**
 * @fileoverview Playwright Authentication Plugin for AuthManager
 *
 * This module provides the standard auth plugin interface that AuthManager expects.
 * It wraps the Playwright-based browser authentication to return credentials in
 * the format required by the ADT authentication system.
 *
 * @module @abapify/adt-playwright/auth-plugin
 */

import type {
  AuthPlugin,
  AuthPluginResult,
  AuthPluginOptions,
  AuthSession,
} from '@abapify/adt-auth';
import { playwrightAuth, toCookieHeader } from './playwright-auth';

/** Default session duration when cookies don't specify expiration (8 hours) */
const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

/**
 * Determines the session expiration time from cookie data.
 *
 * Examines all cookies and returns the earliest expiration time found.
 * If no cookies have expiration set (common with session cookies),
 * returns a default expiration of 8 hours from now.
 *
 * @param cookies - Array of cookie objects with optional expires field
 * @returns The earliest expiration date, or default 8 hours from now
 *
 * @example
 * // Cookie with expiration
 * getExpiresAt([{ expires: 1732900000 }]) // Returns Date from timestamp
 *
 * @example
 * // Session cookie (no expiration)
 * getExpiresAt([{ expires: 0 }]) // Returns Date 8 hours from now
 */
function getExpiresAt(cookies: { expires?: number }[]): Date {
  const expirations = cookies
    .filter((c) => c.expires && c.expires > 0)
    .map((c) => c.expires! * 1000); // Cookie expires is in seconds, convert to ms

  if (expirations.length > 0) {
    return new Date(Math.min(...expirations));
  }

  return new Date(Date.now() + DEFAULT_SESSION_DURATION_MS);
}

/**
 * Playwright authentication plugin for AuthManager.
 *
 * Implements the standard AuthPlugin interface to integrate Playwright-based
 * browser authentication with the ADT authentication system.
 *
 * @remarks
 * This plugin:
 * - Opens a browser window for SSO authentication
 * - Captures session cookies after successful login
 * - Converts cookies to the format expected by AuthManager
 * - Does NOT support silent refresh (Okta SSO requires user interaction)
 *
 * @example
 * ```typescript
 * // Used internally by AuthManager when destination type is '@abapify/adt-playwright'
 * import authPlugin from '@abapify/adt-playwright';
 *
 * const result = await authPlugin.authenticate({
 *   url: 'https://sap-system.example.com',
 *   headless: false,
 *   userDataDir: true,
 * });
 * ```
 */
const authPlugin: AuthPlugin = {
  /**
   * Authenticate using Playwright browser automation.
   *
   * Opens a browser window, navigates to the SAP system, and waits for
   * the user to complete SSO authentication. Captures cookies and returns
   * them in AuthPluginResult format.
   *
   * @param options - Authentication options including URL and browser settings
   * @returns Promise resolving to credentials in AuthPluginResult format
   */
  async authenticate(options: AuthPluginOptions): Promise<AuthPluginResult> {
    const credentials = await playwrightAuth.authenticate(options);
    const cookieString = toCookieHeader(credentials);
    const expiresAt = getExpiresAt(credentials.cookies);

    return {
      method: 'cookie',
      credentials: {
        cookies: cookieString,
        expiresAt,
      },
    };
  },

  /**
   * Attempt to refresh an existing session.
   *
   * @remarks
   * Always returns null because Okta SSO sessions cannot be silently refreshed.
   * When a session expires, full re-authentication with user interaction is required.
   * The AuthManager will handle this by calling authenticate() again.
   *
   * @param _session - The existing session (unused)
   * @returns Always null, indicating refresh is not supported
   */
  async refresh(_session: AuthSession): Promise<AuthPluginResult | null> {
    return null;
  },
};

export default authPlugin;
