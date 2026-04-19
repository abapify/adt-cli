/**
 * Association and composition grammar coverage.
 *
 *   association[<cardinality>]  [of (many|one)]? to [redirected to]? <target>
 *       [as <alias>]  [on <expression>]  ;|,
 *   composition[<cardinality>]  [of (many|one)]? to [redirected to]? <target>
 *       [as <alias>]  [on <expression>]  ;|,
 *
 * Cardinality forms:
 *   - `[N]`            upper bound = N, lower implicit 0
 *   - `[L..U]`         lower = L, upper = U
 *   - `[L..*]`         lower = L, upper unbounded
 *   - `[*]`            unbounded (fallback; Chevrotain receives `*` via ident)
 *
 * `redirected to` introduces projection-view re-targeting for associations
 * defined on the underlying view.
 *
 * Not yet implemented:
 *   - inline `@Consumption.filter` macros.
 *   - `with default filter <cond>`.
 */
import type { GrammarCoverage } from './index';

export const associationsCoverage: GrammarCoverage = {
  topic: 'associations',
  constructs: [
    'association to <target>',
    'association[cardinality] to <target>',
    'association[L..U] to <target>',
    'association of (many|one) to <target>',
    'composition to <target>',
    'association to redirected to <target>',
    'association ... as <alias>',
    'association ... on <expression>',
  ],
};
