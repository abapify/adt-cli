/**
 * /sap/bc/adt/runtime/traces
 *
 * Runtime trace list and detail endpoints used by diagnostics tooling.
 */

import { contract, http } from '../../../base';
import { runtimeTraceDetailSchema, runtimeTraceListSchema } from '../schema';

export const profile = contract({
  list: () =>
    http.get('/sap/bc/adt/runtime/traces', {
      responses: { 200: runtimeTraceListSchema },
      headers: { Accept: 'application/json' },
    }),
  hitlist: (id: string) =>
    http.get(`/sap/bc/adt/runtime/traces/${id}/hitlist`, {
      responses: { 200: runtimeTraceDetailSchema },
      headers: { Accept: 'application/json' },
    }),
  dbAccesses: (id: string) =>
    http.get(`/sap/bc/adt/runtime/traces/${id}/dbaccesses`, {
      responses: { 200: runtimeTraceDetailSchema },
      headers: { Accept: 'application/json' },
    }),
});

export type RuntimeTraceProfileContract = typeof profile;
