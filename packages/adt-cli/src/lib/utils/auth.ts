/**
 * CLI Auth Utilities
 *
 * Thin wrapper around @abapify/adt-auth
 * All auth logic is in the adt-auth package (single source of truth)
 */

import { AuthManager } from '@abapify/adt-auth';

// Re-export types from adt-auth
export type {
  AuthSession,
  AuthConfig,
  AuthMethod,
  BasicCredentials,
  CookieCredentials,
  Credentials,
  AuthPlugin,
  AuthPluginOptions,
  AuthPluginResult,
} from '@abapify/adt-auth';

// Singleton AuthManager instance for CLI
const authManager = new AuthManager();

// =============================================================================
// Session Management - Delegates to AuthManager
// =============================================================================

/**
 * Load auth session
 */
export function loadAuthSession(sid?: string) {
  return authManager.getSession(sid);
}

/**
 * Save auth session
 */
export function saveAuthSession(
  session: Parameters<typeof authManager.saveSession>[0],
) {
  authManager.saveSession(session);
}

/**
 * List all available SIDs
 */
export function listAvailableSids() {
  return authManager.listSids();
}

// =============================================================================
// Default SID Management
// =============================================================================

/**
 * Get default SID
 */
export function getDefaultSid() {
  return authManager.getDefaultSid() ?? undefined;
}

/**
 * Set default SID
 */
export function setDefaultSid(sid: string) {
  authManager.setDefaultSid(sid);
}

// =============================================================================
// Credential Helpers
// =============================================================================

/**
 * Check if session is expired
 */
export function isExpired(
  session: Parameters<typeof authManager.isExpired>[0],
) {
  return authManager.isExpired(session);
}

/**
 * Refresh credentials using auth plugin
 */
export async function refreshCredentials(
  session: Parameters<typeof authManager.refreshCredentials>[0],
  options?: Parameters<typeof authManager.refreshCredentials>[1],
) {
  return authManager.refreshCredentials(session, options);
}

/**
 * Get the AuthManager instance (for advanced use)
 */
export function getAuthManager() {
  return authManager;
}
