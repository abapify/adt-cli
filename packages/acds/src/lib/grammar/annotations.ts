/**
 * Annotation grammar coverage.
 *
 * CDS annotations can appear in several scopes:
 *   - Top of a source file (attached to the following definition).
 *   - Element of a table / structure / view / abstract / custom entity.
 *   - Parameter definition.
 *   - Associated element inside `annotate entity ... with { ... }` (DDLX).
 *
 * Value forms:
 *   - string literal: `'text'`
 *   - enum literal : `#TRANSPARENT`
 *   - boolean      : `true` / `false`
 *   - number       : `42`, `3.14`
 *   - array        : `[ <value>, <value>, ... ]`
 *   - object       : `{ prop: <value>, prop.sub: <value> }`
 *   - bare `@Anno` (equivalent to `@Anno : true`)
 *
 * Not yet implemented:
 *   - `@Scope:[#...]` scope restriction enforcement.
 *   - Macro substitution / includes within annotation bodies.
 */
import type { GrammarCoverage } from './index';

export const annotationsCoverage: GrammarCoverage = {
  topic: 'annotations',
  constructs: [
    '@Key : value',
    '@Key.path : value',
    'array value',
    'object value',
    'nested objects',
    'bare boolean (@Key)',
  ],
};
