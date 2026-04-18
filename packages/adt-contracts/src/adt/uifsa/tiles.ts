/**
 * Fiori Launchpad tiles (CHIPs) — `/sap/opu/odata/UI2/PAGE_BUILDER_PERS/Chips`.
 *
 * A "tile" in FLP is actually a CHIP (Collaborative Human Interface Part)
 * instance attached to a catalog / page. The Page Builder OData service
 * exposes them through the `Chips` entity set.
 *
 * Read-only in v1 (E14 scope).
 */

import { http } from '../../base';
import { flpTileListSchema, flpTileSchema } from './schema';

const BASE = '/sap/opu/odata/UI2/PAGE_BUILDER_PERS/Chips';

function encodeKey(id: string): string {
  return `'${encodeURIComponent(id)}'`;
}

/** List all tiles known to the system. */
const list = () =>
  http.get(BASE, {
    query: { $format: 'json' },
    responses: { 200: flpTileListSchema },
    headers: { Accept: 'application/json' },
  });

/** Get a single tile by its CHIP ID (e.g. `X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER`). */
const get = (id: string) =>
  http.get(`${BASE}(${encodeKey(id)})`, {
    query: { $format: 'json' },
    responses: { 200: flpTileSchema },
    headers: { Accept: 'application/json' },
  });

export const tiles = {
  list,
  get,
};

export type TilesContract = typeof tiles;
