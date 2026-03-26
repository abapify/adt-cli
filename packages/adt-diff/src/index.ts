/**
 * @abapify/adt-diff
 *
 * Diff CLI plugin for adt-cli — compare local abapGit files
 * against SAP remote source. Works with any object type supported
 * by @abapify/adt-plugin-abapgit.
 *
 * @example
 * ```typescript
 * // In adt.config.ts
 * export default {
 *   commands: [
 *     '@abapify/adt-diff/commands/diff',
 *   ],
 * };
 * ```
 */

export { diffCommand } from './commands/diff';

// TABL-specific CDS DDL builder (optional utility — not used by diff command)
export {
  buildCdsDdl,
  tablXmlToCdsDdl,
  parseTablXml,
  type DD02VData,
  type DD03PData,
} from './lib/abapgit-to-cds';
