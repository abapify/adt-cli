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
export type {
  AtcResult,
  AtcFinding,
  OutputFormat,
  FindingResolver,
  ResolvedLocation,
} from './types';
