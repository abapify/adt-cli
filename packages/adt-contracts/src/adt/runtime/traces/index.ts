/**
 * /sap/bc/adt/runtime/traces
 *
 * Runtime trace endpoints (currently only ABAP coverage).
 */

import { coverageContract, type CoverageContract } from './coverage';
import { profile, type RuntimeTraceProfileContract } from './profile';

export * from './coverage';
export * from './profile';

export interface TracesContract {
  coverage: CoverageContract;
  profile: RuntimeTraceProfileContract;
}

export const tracesContract: TracesContract = {
  coverage: coverageContract,
  profile,
};
