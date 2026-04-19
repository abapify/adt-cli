/**
 * Fiori Launchpad catalogs — `/sap/opu/odata/UI2/PAGE_BUILDER_PERS/Catalogs`.
 *
 * Read-only in v1 (E14 scope). Create/delete are handled by
 * `sap/flp/service.py` in sapcli but are out of scope here.
 */

import { http } from '../../base';
import {
  flpCatalogListSchema,
  flpCatalogSchema,
  flpTileListSchema,
} from './schema';

const BASE = '/sap/opu/odata/UI2/PAGE_BUILDER_PERS/Catalogs';

/** Encode an OData entity key for use in the URL segment `Catalogs('<id>')`. */
function encodeKey(id: string): string {
  // SAP OData v2 requires single quotes around string keys and percent-
  // encoding of unsafe characters. `encodeURIComponent` handles the rest.
  return `'${encodeURIComponent(id)}'`;
}

/** List all catalogs. */
const list = () =>
  http.get(BASE, {
    query: { $format: 'json' },
    responses: { 200: flpCatalogListSchema },
    headers: { Accept: 'application/json' },
  });

/** Get a single catalog by its ID (e.g. `X-SAP-UI2-CATALOGPAGE:SAP_A4C…`). */
const get = (id: string) =>
  http.get(`${BASE}(${encodeKey(id)})`, {
    query: { $format: 'json' },
    responses: { 200: flpCatalogSchema },
    headers: { Accept: 'application/json' },
  });

/** List tiles (chips) that belong to a specific catalog. */
const tiles = (id: string) =>
  http.get(`${BASE}(${encodeKey(id)})/Chips`, {
    query: { $format: 'json' },
    responses: { 200: flpTileListSchema },
    headers: { Accept: 'application/json' },
  });

export const catalogs = {
  list,
  get,
  tiles,
};

export type CatalogsContract = typeof catalogs;
