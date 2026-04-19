/**
 * ADT Repository – generic Object Structure endpoint.
 *
 * Most typed object contracts (`programs`, `classes`, …) already expose
 * their own `.objectstructure()` method via the CRUD helper. This
 * contract handles the *generic* case used by the workbench outline
 * CLI / MCP surfaces: an arbitrary object URI whose type does not have
 * a dedicated typed contract (e.g. DOMA, DTEL, DEVC, BDEF, SRVD, …).
 *
 * ADT endpoint:
 *     GET {objectUri}/objectstructure?version=<active|inactive>
 *
 * The response shape varies wildly between object types, so the
 * returned type is `unknown` — callers handle downstream. Keeping this
 * as a typed contract (instead of a raw `client.fetch()` call) ensures
 * the generic outline path still goes through the contract layer.
 */

import { http, contract } from '../../base';

export const objectstructureContract = contract({
  get: (params: { objectUri: string; version?: 'active' | 'inactive' }) =>
    http.get(`${params.objectUri}/objectstructure`, {
      query: {
        ...(params.version ? { version: params.version } : {}),
      },
      responses: { 200: undefined },
      headers: { Accept: 'application/json' },
    }),
});

export type ObjectstructureContract = typeof objectstructureContract;
