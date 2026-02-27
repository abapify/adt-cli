/**
 * @lazy - Lazy Initialization Decorator
 *
 * Computes a value once on first access, then caches it.
 *
 * Usage:
 *   class MyObject {
 *     @lazy(self => `${self.a}/${self.b}`)
 *     key!: string;
 *   }
 *
 * Note: Due to class field shadowing, use `declare` keyword:
 *   @lazy(self => compute())
 *   declare myProp: Type;
 */

const LAZY_CACHE = Symbol('lazy:cache');

export type LazyFactory<T, R> = (self: T) => R;

/**
 * @lazy - Lazy computed property decorator
 *
 * @param factory - Function that computes the value (receives `this`)
 *
 * @example
 * ```typescript
 * class MyClass {
 *   firstName = 'John';
 *   lastName = 'Doe';
 *
 *   @lazy(self => `${self.firstName} ${self.lastName}`)
 *   declare fullName: string;
 * }
 * ```
 */
export function lazy<T extends object, R>(
  factory: LazyFactory<T, R>,
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    const key = String(propertyKey);

    Object.defineProperty(target, key, {
      get(this: T & { [LAZY_CACHE]?: Map<string, unknown> }) {
        // Initialize cache if needed
        let cache = this[LAZY_CACHE];
        if (!cache) {
          cache = new Map();
          (this as { [LAZY_CACHE]: Map<string, unknown> })[LAZY_CACHE] = cache;
        }

        // Return cached value or compute
        if (!cache.has(key)) {
          cache.set(key, factory(this));
        }
        return cache.get(key) as R;
      },
      enumerable: true,
      configurable: true,
    });
  } as PropertyDecorator;
}

/**
 * Invalidate a specific lazy property (force recomputation on next access)
 */
export function invalidateLazy<T extends object>(
  obj: T,
  propertyKey: string,
): void {
  const cache = (obj as { [LAZY_CACHE]?: Map<string, unknown> })[LAZY_CACHE];
  cache?.delete(propertyKey);
}

/**
 * Invalidate all lazy properties on an object
 */
export function invalidateAllLazy<T extends object>(obj: T): void {
  const cache = (obj as { [LAZY_CACHE]?: Map<string, unknown> })[LAZY_CACHE];
  cache?.clear();
}
