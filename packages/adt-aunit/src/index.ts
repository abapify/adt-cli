/**
 * @abapify/adt-aunit
 *
 * ABAP Unit Test CLI plugin for adt-cli.
 * Supports JUnit XML output for GitLab CI integration.
 *
 * @example
 * ```typescript
 * // In adt.config.ts
 * export default {
 *   commands: [
 *     '@abapify/adt-aunit/commands/aunit',
 *   ],
 * };
 * ```
 *
 * @example GitLab CI
 * ```yaml
 * abap-unit:
 *   script:
 *     - npx adt aunit -p $PACKAGE --format junit --output aunit-report.xml
 *   artifacts:
 *     when: always
 *     reports:
 *       junit: aunit-report.xml
 * ```
 */

export { aunitCommand } from './commands/aunit';
export { toJunitXml, outputJunitReport } from './formatters';
export type {
  AunitResult,
  AunitProgram,
  AunitTestClass,
  AunitTestMethod,
  AunitAlert,
  AunitStackEntry,
  OutputFormat,
} from './types';
export {
  MalformedAunitReportError,
  normalizeAunitResult,
  normalizeJacocoCoverage,
  type AunitMethodClassification,
  type NormalizedAunitResult,
  type NormalizedJacocoCoverage,
} from './normalize';
