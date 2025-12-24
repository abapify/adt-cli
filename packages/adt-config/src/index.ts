/**
 * @abapify/adt-config
 *
 * Configuration loader for ADT CLI.
 * Loads destinations from adt.config.ts/json files.
 *
 * Usage:
 * ```ts
 * // In adt.config.ts
 * import { defineConfig } from '@abapify/adt-config';
 *
 * export default defineConfig({
 *   destinations: {
 *     BHF: { type: 'puppeteer', options: { url: '...', client: '100' } },
 *   }
 * });
 * ```
 */

// Types
export type {
  Destination,
  DestinationInput,
  AdtConfig,
  AuthPlugin,
  AuthTestResult,
  ContractsConfig,
  ContentTypeMapping,
  EnabledEndpoints,
} from './types';
export type { LoadedConfig } from './config-loader';

// Config Loader
export { loadConfig, defineConfig } from './config-loader';

// Plugin Helper
export { defineAuthPlugin } from './plugin';
