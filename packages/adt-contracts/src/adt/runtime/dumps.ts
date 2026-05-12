/**
 * /sap/bc/adt/runtime/dumps
 *
 * Short dump listing and details.
 */

import { contract, http } from '../../base';
import { runtimeDumpDetailSchema, runtimeDumpListSchema } from './schema';

export interface RuntimeDumpsQuery {
  user?: string;
  maxResults?: number;
}

export const dumps = contract({
  list: (query?: RuntimeDumpsQuery) =>
    http.get('/sap/bc/adt/runtime/dumps', {
      responses: { 200: runtimeDumpListSchema },
      headers: { Accept: 'application/json' },
      query: {
        ...(query?.user ? { user: query.user } : {}),
        ...(query?.maxResults != null ? { maxResults: query.maxResults } : {}),
      },
    }),
  get: (id: string) =>
    http.get(`/sap/bc/adt/runtime/dumps/${id}`, {
      responses: { 200: runtimeDumpDetailSchema },
      headers: { Accept: 'application/json' },
    }),
});

export type RuntimeDumpsContract = typeof dumps;
