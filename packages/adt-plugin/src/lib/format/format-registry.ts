/**
 * Global format-plugin registry.
 *
 * Format plugins self-register at module-load time via
 * `registerFormatPlugin(plugin)`. Consumers look them up via
 * `getFormatPlugin(id)` — they must NOT import format-implementation packages
 * directly. See `docs/architecture/format-plugins.md`.
 *
 * The registry lives on `globalThis` so that a single registration survives
 * across duplicate ESM graph evaluations (e.g. when both the CLI and a
 * plugin's own tests import `@abapify/adt-plugin` along different paths).
 */

import type { FormatPlugin } from './format-plugin';

const REGISTRY_KEY = Symbol.for('@abapify/adt-plugin/format-registry');

interface RegistryStore {
  plugins: Map<string, FormatPlugin>;
}

function getStore(): RegistryStore {
  const g = globalThis as unknown as Record<symbol, RegistryStore | undefined>;
  let store = g[REGISTRY_KEY];
  if (!store) {
    store = { plugins: new Map() };
    g[REGISTRY_KEY] = store;
  }
  return store;
}

/**
 * Register a format plugin.
 *
 * Idempotent for the same plugin instance: registering the same object twice
 * is a no-op (guards against dual-module-graph evaluation during tests /
 * bundler output). Registering a **different** plugin under an id that is
 * already taken throws.
 */
export function registerFormatPlugin(plugin: FormatPlugin): void {
  const store = getStore();
  const existing = store.plugins.get(plugin.id);
  if (existing) {
    if (existing === plugin) return;
    throw new Error(
      `Format plugin with id "${plugin.id}" is already registered (different instance).`,
    );
  }
  store.plugins.set(plugin.id, plugin);
}

/**
 * Look up a registered format plugin by id.
 */
export function getFormatPlugin(id: string): FormatPlugin | undefined {
  return getStore().plugins.get(id);
}

/**
 * Look up a format plugin by id, or throw a consistent error if it is not
 * registered. Use this from CLI commands where a missing plugin is always
 * user-visible.
 */
export function requireFormatPlugin(id: string): FormatPlugin {
  const plugin = getFormatPlugin(id);
  if (!plugin) {
    const available = listFormatPlugins()
      .map((p) => p.id)
      .join(', ');
    throw new Error(
      `Format plugin "${id}" is not registered. ` +
        (available
          ? `Available formats: ${available}.`
          : 'No format plugins are currently registered.'),
    );
  }
  return plugin;
}

/**
 * List all registered format plugins.
 */
export function listFormatPlugins(): FormatPlugin[] {
  return [...getStore().plugins.values()];
}

/**
 * Remove a plugin from the registry.
 *
 * Intended for tests only. Returns true if an entry was removed.
 */
export function unregisterFormatPlugin(id: string): boolean {
  return getStore().plugins.delete(id);
}

/**
 * Clear the registry completely.
 *
 * Intended for tests only.
 */
export function clearFormatRegistry(): void {
  getStore().plugins.clear();
}
