/**
 * @abapify/adt-plugin-gcts — gCTS / AFF format plugin entry point.
 *
 * Importing this module self-registers the plugin into the global
 * `FormatPlugin` registry so that `--format gcts` becomes available
 * throughout the `adt` CLI.
 */

import { registerFormatPlugin } from '@abapify/adt-plugin';
import { gctsFormatPlugin } from './lib/format/gcts-format';

// Self-register on module load. Idempotent — safe against dual module-graph
// evaluation (the same guard abapGit uses).
registerFormatPlugin(gctsFormatPlugin);

// FormatPlugin — preferred public entry-point.
export { gctsFormatPlugin } from './lib/format/gcts-format';

// AdtPlugin — needed for dynamic-import code paths in adt-cli.
export { gctsPlugin, GctsPlugin } from './lib/gcts-plugin';
export { gctsPlugin as default } from './lib/gcts-plugin';

// Handler utilities
export {
  getHandler,
  getSupportedTypes,
  isSupported,
  createHandler,
} from './lib/handlers/base';
export type {
  GctsHandler,
  GctsHandlerDefinition,
  GctsSourceEntry,
} from './lib/handlers/base';

// Filename utilities
export {
  gctsFilename,
  parseGctsFilename,
  adtUriToGctsPath,
  PACKAGE_FILENAME,
  METADATA_EXTENSION,
} from './lib/format/filename';

// Type re-exports
export type { GctsMetadata, GctsHeader, WithHeader } from './lib/format/types';
export type {
  AdtPlugin,
  FormatPlugin,
  FormatHandler,
  SerializedFile,
} from '@abapify/adt-plugin';
