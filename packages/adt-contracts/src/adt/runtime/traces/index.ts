/**
 * /sap/bc/adt/runtime/traces
 *
 * Runtime trace endpoints (currently only ABAP coverage).
 */

import { coverageContract, type CoverageContract } from './coverage';

export * from './coverage';

export interface TracesContract {
  coverage: CoverageContract;
}

export const tracesContract: TracesContract = {
  coverage: coverageContract,
};
