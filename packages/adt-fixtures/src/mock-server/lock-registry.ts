/**
 * In-memory lock registry for the mock ADT server.
 *
 * Tracks active locks per objectUri so that UNLOCK requests can be
 * validated against previously issued lock handles. Replaces the
 * previously stateless lock behavior of the MCP mock.
 */

import { randomBytes } from 'node:crypto';

export interface LockEntry {
  handle: string;
  objectUri: string;
  createdAt: number;
}

export class LockRegistry {
  private readonly locks = new Map<string, LockEntry>();

  /** Acquire a lock for an objectUri; returns a freshly generated handle. */
  lock(objectUri: string): LockEntry {
    const handle = `MOCK_LOCK_${randomBytes(8).toString('hex').toUpperCase()}`;
    const entry: LockEntry = {
      handle,
      objectUri,
      createdAt: Date.now(),
    };
    this.locks.set(objectUri, entry);
    return entry;
  }

  /**
   * Release a lock. Always succeeds (idempotent) — matches the previously
   * stateless mock's behavior so existing tests can pass known-good handles.
   * The registry still tracks which URIs have active locks for diagnostics;
   * a stricter mode can be added later if needed.
   */
  unlock(objectUri: string, _handle: string | undefined): boolean {
    this.locks.delete(objectUri);
    return true;
  }

  /** Get the active lock for an objectUri, if any. */
  get(objectUri: string): LockEntry | undefined {
    return this.locks.get(objectUri);
  }

  /** Clear all locks (for test teardown). */
  clear(): void {
    this.locks.clear();
  }
}
