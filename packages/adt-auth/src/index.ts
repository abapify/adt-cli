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

// Built-in plugins
export { default as basicAuthPlugin } from './plugins/basic';
export { default as serviceKeyAuthPlugin } from './plugins/service-key';

// Utilities
export { resolveServiceKeyFromEnv, readServiceKey } from './utils/env';

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

export type {
  BTPServiceKey,
  UAACredentials,
  ServiceKeyPluginOptions,
} from './types/service-key';
