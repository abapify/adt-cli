/**
 * Transport Request Types
 *
 * Types are inferred from the contract layer (TransportGetResponse).
 * Only operation-specific types (options, results) are defined manually.
 *
 * Schema Structure (from XSD):
 *
 * Root (tm:root)
 * ├── object_type: 'K' (request) | 'T' (task)
 * ├── request (0..1)
 * │   ├── task[] - nested tasks with their objects
 * │   └── all_objects - aggregated objects (shortcut)
 * └── task[] (0..unbounded) - appears at root when fetching a task directly
 *     └── abap_object[] - objects in this task
 *
 * Key insight:
 * - Fetching REQUEST (S0DK942970): objects in response.request.task[].abap_object
 * - Fetching TASK (S0DK942971): objects in response.task[].abap_object
 */

import type { TransportGetResponse } from '../../../base/adt';

// ============================================
// Inferred types from contract schema
// ============================================

/**
 * Full response type from TransportService.get()
 *
 * The schema wraps everything in a 'root' element, so we unwrap it here
 * to provide a flat structure for ADK consumers.
 */
export type TransportData = TransportGetResponse['root'];

/** Request data from schema */
export type TransportRequestData = NonNullable<TransportData['request']>;

/** Task data from schema */
export type TransportTaskData =
  NonNullable<TransportRequestData['task']> extends (infer T)[]
    ? T
    : NonNullable<TransportRequestData['task']>;

/** Object data from schema */
export type TransportObjectData =
  NonNullable<TransportTaskData['abap_object']> extends (infer T)[]
    ? T
    : NonNullable<TransportTaskData['abap_object']>;

// ============================================
// Semantic type aliases (for clarity)
// ============================================

/** Transport status codes */
export type TransportStatus = 'D' | 'R' | 'N'; // D=Modifiable, R=Released, N=Not released

/** Transport type */
export type TransportType = 'K' | 'W' | 'T' | 'C'; // K=Workbench, W=Customizing, T=ToC, C=Copy

// ============================================
// Re-export for convenience (inferred from schema)
// ============================================

export type TransportTask = TransportTaskData;
export type TransportObject = TransportObjectData;

/**
 * Lock handle for transport operations
 */
export interface LockHandle {
  handle: string;
  correlationNumber?: string;
  correlationUser?: string;
}

/**
 * Options for creating a transport
 */
export interface TransportCreateOptions {
  description: string;
  type?: TransportType;
  target?: string;
  project?: string;
  owner?: string;
}

/**
 * Options for updating a transport
 */
export interface TransportUpdateOptions {
  description?: string;
  target?: string;
}

/**
 * Result of release operation
 */
export interface ReleaseResult {
  success: boolean;
  message?: string;
}
