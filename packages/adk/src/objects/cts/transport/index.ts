/**
 * CTS Transport - Request, Task, Object
 *
 * Simplified 2-layer hierarchy:
 * - AdkTransportRequest - full transport with tasks, CRUD
 *   - AdkTransportTask extends AdkTransportRequest - task-specific overrides
 * - AdkTransportObject - lightweight wrapper
 */

// Public types (inferred from schema)
export type {
  TransportData,
  TransportRequestData,
  TransportTaskData,
  TransportObjectData,
  TransportTask,
  TransportObject,
  TransportStatus,
  TransportType,
  TransportCreateOptions,
  TransportUpdateOptions,
  ReleaseResult,
} from './transport.types';

// ADK classes
export {
  AdkTransportRequest,
  AdkTransportTask,
  clearConfigCache,
} from './transport';
export { AdkTransportObject } from './transport-object';

// Backward compatibility alias
export { AdkTransportRequest as AdkTransportItem } from './transport';

// Re-export LockHandle type
export type { LockHandle } from './transport.types';
