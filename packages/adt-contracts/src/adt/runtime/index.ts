/**
 * /sap/bc/adt/runtime
 *
 * ABAP runtime endpoints (traces, coverage, …).
 */

import { tracesContract, type TracesContract } from './traces';
import { dumps, type RuntimeDumpsContract } from './dumps';

export * from './traces';
export * from './dumps';
export * from './schema';

export interface RuntimeContract {
  traces: TracesContract;
  dumps: RuntimeDumpsContract;
}

export const runtimeContract: RuntimeContract = {
  traces: tracesContract,
  dumps,
};
