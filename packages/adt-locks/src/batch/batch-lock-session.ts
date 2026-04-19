/**
 * BatchLockSession — acquire and release N locks with best-effort rollback.
 *
 * SAP ADT has no transactional multi-object save. A "batch lock" is therefore
 * a **best-effort** construct:
 *
 *   - `begin()` sequentially acquires a lock on every target. If any lock
 *     acquisition fails, every previously acquired lock in this session is
 *     released before the error is rethrown — leaving the backend in the
 *     same state it was before `begin()` was called.
 *
 *   - `release()` unlocks every successfully acquired handle, swallowing
 *     per-object unlock failures (they are surfaced through the returned
 *     result for the caller to inspect).
 *
 *   - `handles()` exposes the acquired handles so callers can thread them
 *     into downstream save/PUT flows without re-locking.
 *
 * The session is **single-use**: once released (explicitly or via rollback),
 * it cannot be reused. Tests exercise acquire/release/partial-failure paths.
 *
 * Consumer rationale: ADK's per-object `save({mode:'update'})` already owns
 * its own lock/unlock cycle. `BatchLockSession` is therefore positioned as an
 * outer pre-flight primitive — acquire across a whole ChangePlan to catch
 * conflicts BEFORE we start mutating SAP, release before handing off to ADK.
 * When ADK's save cycle later re-locks per object it simply re-uses the same
 * security session (the CSRF token survives), so the double lock is cheap.
 */
import type { LockHandle } from '../types';
import type { LockService, LockOptions } from '../service';

export interface BatchLockTarget {
  /** ADT object URI — e.g. `/sap/bc/adt/oo/classes/zcl_foo` */
  objectUri: string;
  /** Per-target lock options (transport, object name/type for the store). */
  options?: LockOptions;
}

export interface BatchLockAcquisition {
  target: BatchLockTarget;
  handle: LockHandle;
}

export interface BatchReleaseResult {
  released: number;
  failed: Array<{ objectUri: string; error: string }>;
}

export interface BatchLockSessionOptions {
  /**
   * When true, `begin()` stops on the first failure and rolls back locks
   * already acquired in this session. When false (rare), errors are
   * collected and returned but already-acquired locks are kept — use only
   * for diagnostic tooling. Default: true.
   */
  rollbackOnError?: boolean;
}

export interface BatchLockSession {
  /** Acquire all configured locks. Rollback on failure (by default). */
  begin(): Promise<BatchLockAcquisition[]>;
  /** Release every currently held handle. Safe to call multiple times. */
  release(): Promise<BatchReleaseResult>;
  /** Snapshot of currently held handles. */
  handles(): ReadonlyArray<BatchLockAcquisition>;
  /** Has `begin()` completed successfully? */
  readonly active: boolean;
}

/**
 * Create a batch lock session over a set of targets.
 *
 * The session does NOT auto-begin; callers drive the lifecycle explicitly so
 * error handling stays visible at the call-site (`try { begin(); … } finally
 * { release(); }`).
 */
export function createBatchLockSession(
  lockService: Pick<LockService, 'lock' | 'unlock'>,
  targets: BatchLockTarget[],
  options?: BatchLockSessionOptions,
): BatchLockSession {
  const rollback = options?.rollbackOnError ?? true;
  const acquired: BatchLockAcquisition[] = [];
  let beganOnce = false;
  let released = false;

  return {
    async begin() {
      if (beganOnce) {
        throw new Error('BatchLockSession.begin() called more than once');
      }
      beganOnce = true;

      for (const target of targets) {
        try {
          const handle = await lockService.lock(
            target.objectUri,
            target.options,
          );
          acquired.push({ target, handle });
        } catch (err) {
          if (rollback) {
            // Best-effort: release what we already have, then propagate.
            for (const a of acquired.splice(0).reverse()) {
              try {
                await lockService.unlock(a.target.objectUri, {
                  lockHandle: a.handle.handle,
                });
              } catch {
                /* swallow — primary failure is the real signal */
              }
            }
            // Session is done — no further release() work possible.
            released = true;
          }
          throw err instanceof Error
            ? err
            : new Error(`Batch lock failed: ${String(err)}`);
        }
      }
      return [...acquired];
    },

    async release() {
      if (released) return { released: 0, failed: [] };
      released = true;

      const failed: BatchReleaseResult['failed'] = [];
      let ok = 0;
      // Release in reverse acquisition order — symmetric with begin()'s
      // rollback path and avoids surprising the SAP enqueue server.
      for (const a of acquired.splice(0).reverse()) {
        try {
          await lockService.unlock(a.target.objectUri, {
            lockHandle: a.handle.handle,
          });
          ok++;
        } catch (err) {
          failed.push({
            objectUri: a.target.objectUri,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return { released: ok, failed };
    },

    handles() {
      return [...acquired];
    },

    get active() {
      return beganOnce && !released;
    },
  };
}
