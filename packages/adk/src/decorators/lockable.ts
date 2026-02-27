/**
 * ADK Lockable Decorators
 *
 * Provides declarative lock management for ADK objects.
 *
 * Usage:
 *   class AdkTransportRequest extends AdkObject implements Lockable {
 *
 *     @requiresLock()
 *     async update(changes: UpdateOptions): Promise<void> {
 *       // Lock acquired automatically, released after
 *     }
 *
 *     @requiresLock({ keep: true })
 *     async startBatch(): Promise<void> {
 *       // Lock is acquired and KEPT for subsequent operations
 *     }
 *   }
 */

import type { LockHandle } from '../base/model';

/**
 * Interface for lockable objects
 */
export interface Lockable {
  readonly isLocked: boolean;
  lock(): Promise<LockHandle>;
  unlock(): Promise<void>;
}

/**
 * Options for @requiresLock decorator
 */
export interface RequiresLockOptions {
  /** Keep lock after method completes (for batch operations) */
  keep?: boolean;
}

/**
 * @requiresLock - Method decorator
 *
 * Automatically acquires lock before method execution
 * and releases it after (unless keep: true).
 *
 * @param options - Lock options
 * @param options.keep - If true, keep lock after method completes
 *
 * @example
 * ```typescript
 * @requiresLock()
 * async update(data: UpdateData): Promise<void> {
 *   // Lock is acquired before this runs
 *   // Lock is released after this completes
 * }
 *
 * @requiresLock({ keep: true })
 * async startTransaction(): Promise<void> {
 *   // Lock is acquired and KEPT for subsequent operations
 * }
 * ```
 */
export function requiresLock(options?: RequiresLockOptions) {
  return function <T extends Lockable>(
    _target: T,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: Lockable, ...args: unknown[]) {
      const wasLocked = this.isLocked;

      try {
        if (!wasLocked) {
          await this.lock();
        }

        return await originalMethod.apply(this, args);
      } finally {
        // Release lock if we acquired it and keep is not set
        if (!wasLocked && this.isLocked && !options?.keep) {
          await this.unlock();
        }
      }
    };

    return descriptor;
  };
}

/**
 * @readonly - Method decorator (marker)
 *
 * Marks a method as read-only (no lock required).
 * This is purely for documentation/clarity.
 *
 * @example
 * ```typescript
 * @readonly
 * async get(): Promise<Data> {
 *   // No lock needed for read operations
 * }
 * ```
 */
export function readonly(
  _target: any,
  _propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  // No-op decorator, just for documentation
  return descriptor;
}
