/**
 * /sap/bc/adt/runtime/traces/coverage
 *
 * ABAP Coverage endpoints. Used as a follow-up to ABAP Unit runs that
 * request coverage — the aunit runResult contains an atom:link pointing
 * to a measurement ID which is then POSTed here.
 */

import { measurements, type MeasurementsContract } from './measurements';
import { statements, type StatementsContract } from './statements';

export { measurements } from './measurements';
export { statements } from './statements';
export type { MeasurementsContract } from './measurements';
export type { StatementsContract } from './statements';

export interface CoverageContract {
  measurements: MeasurementsContract;
  statements: StatementsContract;
}

export const coverageContract: CoverageContract = {
  measurements,
  statements,
};
