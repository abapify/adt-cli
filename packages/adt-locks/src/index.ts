/**
 * @abapify/adt-locks — ADT lock/unlock operations and lock store management
 *
 * Provides:
 * - Lock/unlock HTTP operations against SAP ADT REST API
 * - Lock response XML parsing
 * - Pluggable lock store (file-based included)
 * - A service that wires everything together
 *
 * @example
 * ```ts
 * import { createLockService, FileLockStore } from '@abapify/adt-locks';
 *
 * const locks = createLockService(client, { store: new FileLockStore() });
 * const handle = await locks.lock('/sap/bc/adt/oo/classes/zcl_test');
 * // ... make changes ...
 * await locks.unlock('/sap/bc/adt/oo/classes/zcl_test', { lockHandle: handle.handle });
 * ```
 */

// Types
export type { LockHandle, LockEntry } from './types';

// Store
export type { LockStore } from './store';
export { FileLockStore } from './store';

// Service
export type {
  LockClient,
  LockService,
  LockOptions,
  UnlockOptions,
} from './service';
export { createLockService, parseLockResponse } from './service';
