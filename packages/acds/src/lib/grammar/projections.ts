/**
 * Projection / view grammar coverage.
 *
 * View body element (per member):
 *   [annotation*] [key] [virtual] [redirected] (
 *       <name> : <type> [not null]    -- typed field (abstract/custom entities)
 *     | <qualified-name> [as <alias>] -- projection element
 *   ) ;|,
 *
 * Plus any association declarations (see `associations.ts`).
 *
 * Not yet implemented:
 *   - Cast expressions (`cast( ... as ... )`).
 *   - Case / when / else expressions.
 *   - Aggregate functions (`sum`, `min`, ...).
 *   - Window functions.
 *   - Unions / selects combined in element bodies.
 */
import type { GrammarCoverage } from './index';

export const projectionsCoverage: GrammarCoverage = {
  topic: 'projections',
  constructs: [
    'view element (qualified name)',
    'view element with alias',
    'view element with key modifier',
    'view element with virtual modifier',
    'typed field (abstract/custom entity)',
    'view where clause',
    'projection view (as projection on <source>)',
  ],
};
