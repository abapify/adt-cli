/**
 * abapGit Handler System
 *
 * Use `createHandler` factory to create handlers.
 * Handlers auto-register when created.
 */

// Export factory and types
export { createHandler } from './base';
export type {
  SerializedFile,
  ObjectHandler,
  AbapObjectType,
  HandlerDefinition,
  HandlerContext,
  ObjectPayload,
} from './base';

// Export registry functions (also triggers handler loading)
export { getHandler, isSupported, getSupportedTypes } from './registry';
