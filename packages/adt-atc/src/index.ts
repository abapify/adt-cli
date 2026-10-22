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
export {
  parseCheckCategoryIndex,
  fetchCheckCategoryIndex,
  enrichFindingsWithCategories,
  enrichResultWithCategories,
} from './check-categories';
export type {
  FormTemplateDocument,
  FormTemplateCategoryEntry,
  FormTemplateCheckEntry,
  FormTemplateClient,
} from './check-categories';
export {
  parseCheckClassFromDocumentation,
  resolveCategoriesViaDocumentation,
} from './documentation-bridge';
export type {
  DocumentationReadingClient,
  DocumentationBridgeFinding,
} from './documentation-bridge';
export { createAbapGitResolver } from './resolvers/abapgit';
export { adtUriToAbapGitPath } from './resolvers/adt-uri-to-abapgit-path';
export type {
  AtcResult,
  AtcFinding,
  OutputFormat,
  FindingResolver,
  ResolvedLocation,
} from './types';
