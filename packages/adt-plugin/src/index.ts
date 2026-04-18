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
  FormatOptionValue,
  ImportContext,
  ImportResult,
  ExportContext,
  ExportOptions,
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

// Format-plugin registry (serialization formats: abapGit, gCTS, AFF, …)
export type {
  FormatPlugin,
  FormatHandler,
  FormatHandlerSchema,
  SerializedFile,
  ParsedFormatFilename,
} from './lib/format';
export {
  registerFormatPlugin,
  getFormatPlugin,
  requireFormatPlugin,
  listFormatPlugins,
  unregisterFormatPlugin,
  clearFormatRegistry,
} from './lib/format';
