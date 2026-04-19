/**
 * /sap/bc/adt/runtime
 *
 * ABAP runtime endpoints (traces, coverage, …).
 */

import { tracesContract, type TracesContract } from './traces';

export * from './traces';

export interface RuntimeContract {
  traces: TracesContract;
}

export const runtimeContract: RuntimeContract = {
  traces: tracesContract,
};
