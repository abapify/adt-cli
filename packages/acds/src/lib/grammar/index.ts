/**
 * Grammar coverage index.
 *
 * Each topic module in this directory documents a slice of the CDS grammar
 * implemented by the single Chevrotain parser in `../../parser.ts`. They are
 * intentionally documentation-first: Chevrotain's `CstParser` requires all
 * rules to live on one class, so we keep them together and split the docs
 * into focused files. Each module re-exports a `COVERED` array listing the
 * grammar constructs currently implemented — useful for downstream tools
 * (E10/E11/E12) to know what they can rely on.
 */
export type GrammarCoverage = {
  readonly topic: string;
  readonly constructs: readonly string[];
};

export { ddlCoverage } from './ddl';
export { dclCoverage } from './dcl';
export { annotationsCoverage } from './annotations';
export { associationsCoverage } from './associations';
export { parametersCoverage } from './parameters';
export { projectionsCoverage } from './projections';
export { actionsCoverage } from './actions';

import { ddlCoverage } from './ddl';
import { dclCoverage } from './dcl';
import { annotationsCoverage } from './annotations';
import { associationsCoverage } from './associations';
import { parametersCoverage } from './parameters';
import { projectionsCoverage } from './projections';
import { actionsCoverage } from './actions';

export const GRAMMAR_COVERAGE: readonly GrammarCoverage[] = [
  ddlCoverage,
  dclCoverage,
  annotationsCoverage,
  associationsCoverage,
  parametersCoverage,
  projectionsCoverage,
  actionsCoverage,
];
