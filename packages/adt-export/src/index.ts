/**
 * @abapify/adt-export
 *
 * Export CLI plugin for adt-cli - deploy local files to SAP.
 *
 * @example
 * ```typescript
 * // In adt.config.ts
 * export default {
 *   commands: [
 *     '@abapify/adt-export/commands/export',
 *   ],
 * };
 * ```
 */

export { exportCommand } from './commands/export';
export { createFileTree, FsFileTree, MemoryFileTree } from './utils/filetree';
export type {
  FileTree,
  ExportResult,
  ExportObjectResult,
  ExportOptions,
} from './types';
