/**
 * ADT Lock Types
 *
 * Shared type definitions for lock handles and persisted lock entries.
 */

/**
 * Lock handle returned by SAP `_action=LOCK` operations.
 *
 * The handle is required for subsequent PUT (save) and `_action=UNLOCK` calls.
 */
export interface LockHandle {
  /** Opaque lock token from SAP (LOCK_HANDLE) */
  handle: string;
  /** Transport request assigned to this object (CORRNR) */
  correlationNumber?: string;
  /** User who owns the transport (CORRUSER) */
  correlationUser?: string;
}

/**
 * A persisted lock entry — written to the lock store so handles survive process crashes.
 */
export interface LockEntry {
  /** ADT object URI (e.g., /sap/bc/adt/oo/classes/zcl_my_class) */
  objectUri: string;
  /** Human-readable object name */
  objectName: string;
  /** ADT object type (e.g., CLAS/OC, INTF/OI, DTEL) */
  objectType?: string;
  /** The lock handle returned by SAP */
  lockHandle: string;
  /** Transport request from lock response */
  transport?: string;
  /** SAP system host */
  host?: string;
  /** ISO timestamp when lock was acquired */
  lockedAt: string;
}
