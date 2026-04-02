/**
 * Lock Registry - Re-exports from @abapify/adt-locks
 *
 * The canonical lock types and store interface now live in @abapify/adt-locks.
 * This file provides backward-compatible re-exports so that existing code
 * importing from `@abapify/adk` continues to work.
 */

export type { LockEntry } from '@abapify/adt-locks';
export type { LockStore as LockRegistry } from '@abapify/adt-locks';
