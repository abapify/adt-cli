/**
 * Parameter grammar coverage.
 *
 *   with parameters
 *     <name> : <type> [default <literal>]
 *     [, <name> : <type> [default <literal>] ] ...
 *
 * Parameters may carry per-parameter annotations.
 * Consumed by view entities, abstract entities, and custom entities.
 */
import type { GrammarCoverage } from './index';

export const parametersCoverage: GrammarCoverage = {
  topic: 'parameters',
  constructs: [
    'with parameters <p>: <type>',
    'with parameters <p>: <type> default <literal>',
    'annotated parameters',
  ],
};
