/**
 * Fixture registry with lazy proxy loading
 *
 * Registry lives in fixtures/registry.ts (next to the XML files).
 * Proxy auto-generates loaders - nothing loads until .load() is called.
 */

import { load as loadFile } from './loader';
import { registry } from './fixtures/registry';

/** Fixture handle - call .load() to get content */
export interface FixtureHandle {
  /** Path to the fixture file */
  path: string;
  /** Load the fixture content */
  load(): Promise<string>;
}

/** Recursively transform registry into proxy type */
type ProxyRegistry<T> = {
  [K in keyof T]: T[K] extends string ? FixtureHandle : ProxyRegistry<T[K]>;
};

/**
 * Create a proxy that wraps string paths with .load() method
 */
function createProxy<T extends object>(
  obj: T,
  basePath = '',
): ProxyRegistry<T> {
  return new Proxy(obj, {
    get(target, prop: string) {
      const value = (target as any)[prop];

      if (typeof value === 'string') {
        // Leaf node - return handle with .load()
        return {
          path: value,
          load: () => loadFile(value),
        } as FixtureHandle;
      }

      if (typeof value === 'object' && value !== null) {
        // Nested object - recurse
        return createProxy(value, `${basePath}${prop}/`);
      }

      return value;
    },
  }) as ProxyRegistry<T>;
}

/**
 * Fixture accessors - nothing loads until you call .load()
 *
 * @example
 * ```typescript
 * import { fixtures } from 'adt-fixtures';
 *
 * // Get handle (no loading yet!)
 * const handle = fixtures.transport.single;
 * console.log(handle.path); // 'transport/single.xml'
 *
 * // Explicitly load when needed
 * const xml = await handle.load();
 * // or
 * const xml = await fixtures.transport.single.load();
 * ```
 */
export const fixtures = createProxy(registry);

/** Type for the fixtures object */
export type Fixtures = typeof fixtures;
