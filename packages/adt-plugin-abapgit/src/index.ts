// Plugin instance
export { abapGitPlugin, AbapGitPlugin } from './lib/abapgit';

// Finding resolver for ATC integration
export { createFindingResolver } from './lib/finding-resolver';

// Handler registry — for consumers that need to work with handlers directly
export {
  getHandler,
  isSupported,
  getSupportedTypes,
} from './lib/handlers/registry';
export type { SerializedFile, ObjectHandler } from './lib/handlers/base';

// Filename parser — shared utility for abapGit file naming convention
export { parseAbapGitFilename } from './lib/deserializer';

// Re-export types from @abapify/adt-plugin for convenience
export type {
  AdtPlugin,
  AbapObjectType,
  ImportContext,
  ImportResult,
  ExportContext,
  ExportResult,
} from '@abapify/adt-plugin';

// Default export for dynamic loading
export { abapGitPlugin as default } from './lib/abapgit';
