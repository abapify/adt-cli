/**
 * Config Loader
 *
 * Loads ADT configuration from:
 * 1. adt.config.ts (TypeScript config - takes precedence)
 * 2. adt.config.json (JSON config)
 * 3. ~/.adt/config.json (global defaults)
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import type { AdtConfig, Destination } from './types';

// =============================================================================
// Configuration Paths
// =============================================================================

const GLOBAL_CONFIG_PATH = resolve(homedir(), '.adt', 'config.json');

// =============================================================================
// Loaded Config Interface
// =============================================================================

export interface LoadedConfig {
  /** Raw config data */
  readonly raw: AdtConfig;

  /** Get a destination by name (SID) */
  getDestination(name: string): Destination | undefined;

  /** List all destination names */
  listDestinations(): string[];

  /** Check if destination exists */
  hasDestination(name: string): boolean;
}

// =============================================================================
// Config Loading
// =============================================================================

/**
 * Load JSON config from a file path
 */
function loadJsonConfig(filePath: string): AdtConfig | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeDestinationEntry(raw: unknown): Destination | string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  // Already in destination format
  if (
    typeof candidate.type === 'string' &&
    'options' in candidate &&
    candidate.options != null &&
    typeof candidate.options === 'object'
  ) {
    return candidate as unknown as Destination;
  }

  // Service key JSON format
  if (
    typeof candidate.url === 'string' &&
    candidate.uaa != null &&
    typeof candidate.uaa === 'object'
  ) {
    return {
      type: '@abapify/adt-auth/plugins/service-key',
      options: {
        url: candidate.url,
        serviceKey: candidate,
      },
    };
  }

  // URL-only shorthand
  if (typeof candidate.url === 'string') {
    return candidate.url;
  }

  return null;
}

function loadDestinationsDirectory(cwd: string): AdtConfig | null {
  const destinationsDir = join(cwd, '.adt', 'destinations');
  if (!existsSync(destinationsDir)) {
    return null;
  }

  const destinations: Record<string, Destination | string> = {};

  for (const fileName of readdirSync(destinationsDir)) {
    if (!fileName.toLowerCase().endsWith('.json')) {
      continue;
    }

    const sid = fileName.slice(0, -5).toUpperCase();
    const filePath = join(destinationsDir, fileName);

    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
      const normalized = normalizeDestinationEntry(raw);
      if (normalized) {
        destinations[sid] = normalized;
      }
    } catch {
      // Ignore invalid destination files and continue loading others.
    }
  }

  if (Object.keys(destinations).length === 0) {
    return null;
  }

  return { destinations };
}

/**
 * Load TypeScript config (requires dynamic import)
 * The TS config is expected to export a default config object
 */
async function loadTsConfig(filePath: string): Promise<AdtConfig | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    // Dynamic import for TS/JS config files
    const module = await import(filePath);
    return module.default || module;
  } catch {
    return null;
  }
}

/**
 * Merge local config with global config
 * Local destinations override global ones with the same name
 */
function mergeWithGlobal(localConfig: AdtConfig): AdtConfig {
  const globalConfig = loadJsonConfig(GLOBAL_CONFIG_PATH);

  if (!globalConfig) {
    return localConfig;
  }

  return {
    ...globalConfig,
    ...localConfig,
    destinations: {
      ...globalConfig.destinations,
      ...localConfig.destinations,
    },
  };
}

/**
 * Merge two local configs where overlay values win, and destinations are merged by key.
 */
function mergeLocalConfig(
  baseConfig: AdtConfig,
  overlayConfig: AdtConfig,
): AdtConfig {
  return {
    ...baseConfig,
    ...overlayConfig,
    destinations: {
      ...baseConfig.destinations,
      ...overlayConfig.destinations,
    },
  };
}

/**
 * Create LoadedConfig wrapper
 */
function createLoadedConfig(config: AdtConfig): LoadedConfig {
  return {
    raw: config,

    getDestination(name: string): Destination | undefined {
      const dest = config.destinations?.[name];
      if (!dest) return undefined;
      // Handle string shorthand (URL) by converting to Destination object
      // Uses built-in basic auth plugin as the default
      if (typeof dest === 'string') {
        return {
          type: '@abapify/adt-auth/plugins/basic',
          options: { url: dest },
        };
      }
      return dest;
    },

    listDestinations(): string[] {
      return Object.keys(config.destinations || {});
    },

    hasDestination(name: string): boolean {
      return name in (config.destinations || {});
    },
  };
}

export interface LoadConfigOptions {
  /** Explicit config file path (overrides auto-discovery) */
  configPath?: string;
  /** Current working directory for auto-discovery (defaults to process.cwd()) */
  cwd?: string;
}

/**
 * Try loading a config file from an explicit path (JSON or TS/JS).
 */
async function loadExplicitConfig(
  configPath: string,
): Promise<AdtConfig | null> {
  if (configPath.endsWith('.json')) {
    return loadJsonConfig(configPath);
  }
  return loadTsConfig(configPath);
}

/**
 * Discover a config file by trying multiple extensions in priority order:
 * .ts → .js → .json
 */
async function discoverConfig(
  basePath: string,
  baseName: string,
): Promise<AdtConfig | null> {
  const tsConfig = await loadTsConfig(join(basePath, `${baseName}.ts`));
  if (tsConfig) return tsConfig;

  const jsConfig = await loadTsConfig(join(basePath, `${baseName}.js`));
  if (jsConfig) return jsConfig;

  return loadJsonConfig(join(basePath, `${baseName}.json`));
}

/**
 * Load configuration with precedence:
 * 1. Explicit configPath (if provided via --config flag)
 * 2. adt.config.ts in cwd
 * 3. adt.config.json in cwd
 * 4. ~/.adt/config.json (global)
 *
 * @param options Load config options or cwd string for backwards compatibility
 */
export async function loadConfig(
  options: LoadConfigOptions | string = {},
): Promise<LoadedConfig> {
  // Support legacy string parameter (cwd)
  const opts: LoadConfigOptions =
    typeof options === 'string' ? { cwd: options } : options;
  const cwd = opts.cwd ?? process.cwd();

  // If explicit config path provided, use it directly
  if (opts.configPath) {
    if (opts.configPath.includes('..')) {
      console.warn(
        `Warning: Config file path contains path traversal, using auto-discovery`,
      );
    } else {
      const configPath = resolve(cwd, opts.configPath);
      const config = await loadExplicitConfig(configPath);
      if (config) {
        return createLoadedConfig(mergeWithGlobal(config));
      }
      // Config path specified but file not found/loadable - continue with auto-discovery
      console.warn(
        `Warning: Config file not found at ${configPath}, using auto-discovery`,
      );
    }
  }

  // Discover base local config (adt.config.*)
  const baseLocalConfig = await discoverConfig(cwd, 'adt.config');

  // Discover optional local override (.adt/config.*)
  const localOverrideConfig = await discoverConfig(join(cwd, '.adt'), 'config');

  // Discover optional destinations directory (.adt/destinations/*.json)
  const destinationsDirConfig = loadDestinationsDirectory(cwd);

  if (baseLocalConfig || localOverrideConfig || destinationsDirConfig) {
    let mergedLocalConfig = baseLocalConfig || {};

    if (destinationsDirConfig) {
      mergedLocalConfig = mergeLocalConfig(
        mergedLocalConfig,
        destinationsDirConfig,
      );
    }

    if (localOverrideConfig) {
      mergedLocalConfig = mergeLocalConfig(
        mergedLocalConfig,
        localOverrideConfig,
      );
    }

    return createLoadedConfig(mergeWithGlobal(mergedLocalConfig));
  }

  // Fall back to global config
  const globalConfig = loadJsonConfig(GLOBAL_CONFIG_PATH);
  return createLoadedConfig(globalConfig || { destinations: {} });
}

// =============================================================================
// Config Helper - defineConfig
// =============================================================================

/**
 * Helper function for TypeScript config files.
 * Provides type checking and autocomplete.
 *
 * Usage in adt.config.ts:
 * ```ts
 * import { defineConfig } from '@abapify/adt-config';
 *
 * export default defineConfig({
 *   destinations: {
 *     DEV: { type: 'basic', options: { url: '...' } },
 *   }
 * });
 * ```
 */
export function defineConfig(config: AdtConfig): AdtConfig {
  return config;
}
