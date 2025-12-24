/**
 * @abapify/adt-auth
 * 
 * Authentication package for SAP ADT systems
 * Single source of truth for session management across all consumers
 */

// Main exports
export { AuthManager, type Destination } from './auth-manager';

// Storage
export { FileStorage } from './storage/file-storage';

// Types - New format (single source of truth)
export type {
  AuthMethod,
  AuthConfig,
  AuthSession,
  BasicCredentials,
  CookieCredentials,
  Credentials,
  AuthPlugin,
  AuthPluginOptions,
  AuthPluginResult,
  CookieAuthResult,
  BasicAuthResult,
  ConnectionTestResult,
} from './types';

