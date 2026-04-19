/**
 * DDL grammar coverage.
 *
 * Entities implemented by `CdsParser`:
 *   - `define table <name> { ... }`
 *   - `define structure <name> { ... }`
 *   - `define type <name> : <type>;`
 *   - `define view entity <name> [with parameters ...]
 *        as (select from | projection on) <source> [{ ... }] [where ...]`
 *   - `define abstract entity <name> [with parameters ...] { ... }`
 *   - `define custom entity <name> [with parameters ...] { ... }`
 *   - `define service <name> { expose ...; }` (SRVD)
 *   - `annotate entity <name> with { ... }` (DDLX)
 *
 * Not yet implemented (tracked as open questions in the E09 epic):
 *   - Joins (`inner join`, `left outer join ...`)
 *   - CASE / CAST / arithmetic expressions in projection lists
 *   - GROUP BY / HAVING / UNION
 *   - `define aspect` (DRAS), `define hierarchy`, cache definitions (DTDC/DTSC)
 *   - `define scalar function` (DSFD)
 */
import type { GrammarCoverage } from './index';

export const ddlCoverage: GrammarCoverage = {
  topic: 'ddl',
  constructs: [
    'define table',
    'define structure',
    'define type',
    'define view entity',
    'define abstract entity',
    'define custom entity',
    'define service',
    'annotate entity',
    'include directive',
    'builtin type (abap.char, abap.dec, ...)',
    'named type reference',
  ],
};
