/**
 * Lock Registry — re-exports from @abapify/adt-locks
 *
 * This file existed as a local FileLockRegistry implementation.
 * The canonical implementation now lives in @abapify/adt-locks.
 * Re-export for backward compatibility.
 */

export { FileLockStore as FileLockRegistry } from '@abapify/adt-locks';
