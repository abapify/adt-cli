// Plugin instance
export { abapGitPlugin, AbapGitPlugin } from './lib/abapgit';

// Finding resolver for ATC integration
export { createFindingResolver } from './lib/finding-resolver';

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
