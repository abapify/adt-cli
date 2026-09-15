/**
 * @abapify/adt-atc
 *
 * ABAP Test Cockpit (ATC) CLI plugin for adt-cli.
 *
 * @example
 * ```typescript
 * // In adt.config.ts
 * export default {
 *   commands: [
 *     '@abapify/adt-atc/commands/atc',
 *   ],
 * };
 * ```
 */

export { atcCommand } from './commands/atc';
export { atcCustomizingCommand } from './commands/atc-customizing';
export { outputSarifReport, outputGitLabCodeQuality } from './formatters';
export { createAbapGitResolver } from './resolvers/abapgit';
export { adtUriToAbapGitPath } from './resolvers/adt-uri-to-abapgit-path';
export type {
  AtcResult,
  AtcFinding,
  OutputFormat,
  FindingResolver,
  ResolvedLocation,
} from './types';
