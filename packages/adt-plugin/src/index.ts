/**
 * @abapify/adt-plugin
 *
 * ADT Plugin interface and factory for abapify.
 *
 * @example
 * ```typescript
 * import { createPlugin, type AdtPlugin } from '@abapify/adt-plugin';
 *
 * export const myPlugin = createPlugin({
 *   name: 'myFormat',
 *   version: '1.0.0',
 *   description: 'My format plugin',
 *   registry: { ... },
 *   format: { ... },
 * });
 * ```
 */

// Format Plugin Types
export type {
  AbapObjectType,
  ImportContext,
  ImportResult,
  ExportContext,
  ExportResult,
  FileTree,
  AdtPlugin,
  AdtPluginDefinition,
} from './types';

// CLI Command Plugin Types
export type {
  CliOption,
  CliArgument,
  CliContext,
  CliLogger,
  CliCommandPlugin,
  CliCommandModule,
  AdtCliConfig,
} from './cli-types';

// Factory
export { createPlugin } from './factory';
