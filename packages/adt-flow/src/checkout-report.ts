import { compareStrings } from './deterministic';
import type { FlowCheckoutResult, FlowSkippedObject } from './types';

export interface FlowPartialReport {
  schemaVersion: 1;
  requestedTransports: string[];
  skipped: FlowSkippedObject[];
}

export type FlowCheckoutReport = FlowPartialReport &
  Pick<
    FlowCheckoutResult,
    | 'mode'
    | 'scopeTransports'
    | 'inventory'
    | 'inventoryResolutions'
    | 'descriptors'
    | 'absentObjects'
  > & {
    coverageVersion: 1;
    indexedOnly: boolean;
  };

/** Build the existing omission-report contract without storage or side effects. */
export function createFlowPartialReport(
  result: FlowCheckoutResult,
): FlowPartialReport {
  return {
    schemaVersion: 1,
    requestedTransports: [...result.requestedTransports],
    skipped: result.skipped
      .map((entry) => ({ ...entry }))
      .sort(
        (a, b) =>
          compareStrings(a.object, b.object) ||
          compareStrings(a.component, b.component) ||
          compareStrings(a.diagnostic, b.diagnostic) ||
          compareStrings(a.sourceTransport ?? '', b.sourceTransport ?? ''),
      ),
  };
}

/** Report checkout facts; an empty skipped list alone does not prove completeness. */
export function createFlowCheckoutReport(
  result: FlowCheckoutResult,
): FlowCheckoutReport {
  const partial = createFlowPartialReport(result);
  return {
    schemaVersion: partial.schemaVersion,
    requestedTransports: partial.requestedTransports,
    mode: result.mode,
    scopeTransports: [...result.scopeTransports],
    inventory: result.inventory,
    inventoryResolutions: result.inventoryResolutions,
    descriptors: [...result.descriptors],
    absentObjects: result.absentObjects,
    indexedOnly: result.indexedOnly === true,
    coverageVersion: 1,
    skipped: partial.skipped,
  };
}
