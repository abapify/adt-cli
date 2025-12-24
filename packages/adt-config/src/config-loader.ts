/**
 * Config Loader
 *
 * Loads ADT configuration from:
 * 1. adt.config.ts (TypeScript config - takes precedence)
 * 2. adt.config.json (JSON config)
 * 3. ~/.adt/config.json (global defaults)
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import type { AdtConfig, Destination } from './types';

// =============================================================================
// Configuration Paths
// =============================================================================

const GLOBAL_CONFIG_PATH = resolve(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.adt',
  'config.json',
);

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
 * Create LoadedConfig wrapper
 */
function createLoadedConfig(config: AdtConfig): LoadedConfig {
  return {
    raw: config,

    getDestination(name: string): Destination | undefined {
      const dest = config.destinations?.[name];
      if (!dest) return undefined;
      // Handle string shorthand (URL) by converting to Destination object
      if (typeof dest === 'string') {
        return { type: 'url', options: { url: dest } };
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

/**
 * Load configuration with precedence:
 * 1. adt.config.ts in cwd
 * 2. adt.config.json in cwd
 * 3. ~/.adt/config.json (global)
 *
 * @param cwd Current working directory (defaults to process.cwd())
 */
export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<LoadedConfig> {
  // Try TS config first
  const tsConfigPath = join(cwd, 'adt.config.ts');
  const tsConfig = await loadTsConfig(tsConfigPath);
  if (tsConfig) {
    return createLoadedConfig(mergeWithGlobal(tsConfig));
  }

  // Try JS config
  const jsConfigPath = join(cwd, 'adt.config.js');
  const jsConfig = await loadTsConfig(jsConfigPath);
  if (jsConfig) {
    return createLoadedConfig(mergeWithGlobal(jsConfig));
  }

  // Try JSON config
  const jsonConfigPath = join(cwd, 'adt.config.json');
  const jsonConfig = loadJsonConfig(jsonConfigPath);
  if (jsonConfig) {
    return createLoadedConfig(mergeWithGlobal(jsonConfig));
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
