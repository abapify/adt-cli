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

// Register 'aff' as an alias for the same plugin so `getFormatPlugin('aff')`
// resolves to the gCTS/AFF plugin (both ids share the same on-disk layout).
registerFormatPlugin({ ...gctsFormatPlugin, id: 'aff' });

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

// AFF schema access + validation over the git_modules submodule
export {
  affRoot,
  listAffTypes,
  affVersions,
  latestAffVersion,
  affSchema,
  affValidate,
  affExamples,
  schemaTargetForExample,
  readAffExample,
} from './lib/aff/schemas';

// Generated typed AFF models — AffGenerated.{Type}V{n}.{RootInterface}
export * as AffGenerated from './schemas/generated';

// Type re-exports
export type { GctsMetadata, GctsHeader, WithHeader } from './lib/format/types';
export type {
  AdtPlugin,
  FormatPlugin,
  FormatHandler,
  SerializedFile,
} from '@abapify/adt-plugin';
