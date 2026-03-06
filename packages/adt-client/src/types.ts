/**
 * Core types for ADT Client V2
 */

import type { Logger } from '@abapify/logger';

// Re-export Logger for convenience
export type { Logger };

// Connection configuration
export interface AdtConnectionConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  cookieHeader?: string; // For SAML authentication
  authorizationHeader?: string; // For Bearer token auth (e.g., OAuth / BTP service key)
  client?: string;
  language?: string;
  logger?: Logger;
}

// Note: Class/Interface types are available from adt-schemas via InferXsd
// Example: import { classes, InferXsd } from 'adt-schemas';
// type ClassData = InferXsd<typeof classes, 'AbapClass'>;

// Error types are now in errors.ts with full ADT exception parsing
// Re-export for backward compatibility
export { AdtError, type AdtExceptionData } from './errors';

// Lock handle for object locking
export interface LockHandle {
  lockHandle: string;
  objectUri: string;
}

// Create/Update result
export interface OperationResult {
  success: boolean;
  message?: string;
}
