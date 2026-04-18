/**
 * DCL (access control) grammar coverage.
 *
 *   define role <name> {
 *     grant select on <entity> [where <expression>] ;
 *     ...
 *   }
 *
 * Expressions inside `where` are captured as opaque `Expression` tokens —
 * downstream consumers can inspect the `source` / `tokens` arrays but the
 * parser does not interpret them further.
 *
 * Not yet implemented:
 *   - `inherit` / `redefinition` clauses
 *   - `select distinct`, `grant update|delete|...`
 *   - `privileges`, pfcg-mapped roles
 */
import type { GrammarCoverage } from './index';

export const dclCoverage: GrammarCoverage = {
  topic: 'dcl',
  constructs: [
    'define role <name> { ... }',
    'grant select on <entity>',
    'grant select on <entity> where <expression>',
  ],
};
