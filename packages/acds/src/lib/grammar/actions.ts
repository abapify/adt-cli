/**
 * Action / function grammar coverage.
 *
 * NOTE: CDS-level `define action` / `define function` declarations live inside
 * RAP behavior definitions (`.bdef`) and are the responsibility of E10 (BDEF).
 * This module is a placeholder that currently **does not** parse action
 * signatures — it documents what E10 is expected to layer on top of the
 * CDS parser.
 *
 * Expected coverage for downstream:
 *   - `define action <name> [parameter <p> : <type>] returns <type>`
 *   - `define function <name>(<params>) returns <type>`
 *   - Behavior implementation bindings (handled entirely in E10).
 */
import type { GrammarCoverage } from './index';

export const actionsCoverage: GrammarCoverage = {
  topic: 'actions',
  constructs: [
    // intentionally empty — populated by E10.
  ],
};
