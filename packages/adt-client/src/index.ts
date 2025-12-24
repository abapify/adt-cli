/**
 * ADT Client V2 - Minimalistic speci-based ADT client
 *
 * Uses speci's client generation instead of manually implementing HTTP calls.
 */

// Export main client factory
export { createAdtClient, type AdtClient } from './client';

// Export contract for advanced use cases
export { adtContract, type AdtContract } from '@abapify/adt-contracts';

// Export types
export type {
  AdtConnectionConfig,
  OperationResult,
  LockHandle,
  AdtError,
  Logger,
} from './types';

// Response types are re-exported from adt-contracts for consumers
// Note: Session and SystemInformation types are available via contract response inference

// Export adapter for advanced use cases
export {
  createAdtAdapter,
  type HttpAdapter,
  type AdtAdapterConfig,
} from './adapter';

// Export plugins
export {
  type ResponsePlugin,
  type ResponseContext,
  type LogFunction,
  type FileLoggingConfig,
  LoggingPlugin,
  FileLoggingPlugin,
} from './plugins';

// Export session management
export { SessionManager, CookieStore, CsrfTokenManager } from './utils/session';

// Re-export contract types needed for declaration generation
export type {
  RestEndpointDescriptor,
  Serializable,
  RestContract,
} from '@abapify/adt-contracts';

// Re-export CRUD contract types for ADK consumers
// This allows ADK to use typed CRUD contracts without depending on adt-contracts directly
export type {
  CrudContract,
  CrudContractBase,
  CrudQueryParams,
  LockOptions,
  UnlockOptions,
  ObjectStructureOptions,
  SourceOperations,
  SourcesContract,
  IncludesContract,
} from '@abapify/adt-contracts';

// Re-export contract response types for ADK consumers
// This allows ADK to depend only on adt-client, not adt-contracts directly
export type { ClassResponse, InterfaceResponse } from '@abapify/adt-contracts';
export type { Package as PackageResponse } from '@abapify/adt-contracts';

// Transport response type - exported directly from contracts
// Note: Transport business logic has moved to @abapify/adk (AdkTransportRequest)
export type { TransportResponse as TransportGetResponse } from '@abapify/adt-contracts';

// Export services layer
export {
  TransportService,
  createTransportService,
  type Transport,
  type TransportTask,
  type CreateTransportOptions,
  type ListTransportsOptions,
} from './services';
