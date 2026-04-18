/**
 * Real-SAP e2e for E14 — Fiori Launchpad inventory.
 *
 * Probes the Page Builder OData service
 * (`/sap/opu/odata/UI2/PAGE_BUILDER_PERS/`) on the real system pointed
 * at by `ADT_REAL_SID` (default `TRL`). On BTP Trial the PERS service
 * is reachable read-only with the authenticated session cookies; the
 * CUST and FDM_FLP variants tend to return 403, which is expected and
 * out of scope for v1.
 *
 * Behaviour:
 *  - If the server returns 403/404/501 we log a skip and pass (the FLP
 *    surface is not guaranteed on every hardened SAP system).
 *  - On success we assert that the OData envelope (`d.results`) is
 *    present and write the (already-sanitised) captured responses back
 *    into the shared fixture tree via `captureFixture()`.
 */

import { expect, it } from 'vitest';
import type {
  FlpCatalogListResponse,
  FlpGroupListResponse,
  FlpTileListResponse,
  FlpTileResponse,
} from '@abapify/adt-contracts';
import { captureFixture, describeReal, getRealClient } from './helpers';

type HttpError = { status?: number; message?: string };

function isUnsupported(err: unknown): err is HttpError {
  if (!err || typeof err !== 'object') return false;
  const e = err as HttpError;
  if (typeof e.status === 'number' && [403, 404, 501].includes(e.status)) {
    return true;
  }
  const m = (e.message ?? '').toLowerCase();
  return (
    m.includes('http 403') ||
    m.includes('http 404') ||
    m.includes('http 501') ||
    m.includes('does not exist') ||
    m.includes('forbidden')
  );
}

describeReal('E14 FLP', () => {
  it('list catalogs via Page Builder OData (or skip if disabled)', async () => {
    const client = await getRealClient();

    let res: FlpCatalogListResponse;
    try {
      res = await client.adt.flp.catalogs.list();
    } catch (err) {
      if (isUnsupported(err)) {
        console.warn(
          `[E14] Page Builder OData not available on real SAP system: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
        );
        return;
      }
      throw err;
    }

    expect(res?.d?.results).toBeDefined();
    expect(Array.isArray(res.d?.results)).toBe(true);

    // Persist the raw response so the fixture is traceable to a real
    // capture; the helper adds a `_captured` marker.
    captureFixture(
      res as unknown as Record<string, unknown>,
      'flp/real-catalog-list.json',
    );
  }, 120_000);

  it('list groups / pages via Page Builder OData', async () => {
    const client = await getRealClient();

    let res: FlpGroupListResponse;
    try {
      res = await client.adt.flp.groups.list();
    } catch (err) {
      if (isUnsupported(err)) {
        console.warn(
          `[E14] FLP Pages endpoint unavailable: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
        );
        return;
      }
      throw err;
    }

    expect(res?.d?.results).toBeDefined();
    captureFixture(
      res as unknown as Record<string, unknown>,
      'flp/real-group-list.json',
    );
  }, 120_000);

  it('list tiles via Page Builder OData (and fetch one tile)', async () => {
    const client = await getRealClient();

    let listRes: FlpTileListResponse;
    try {
      listRes = await client.adt.flp.tiles.list();
    } catch (err) {
      if (isUnsupported(err)) {
        console.warn(
          `[E14] FLP Chips endpoint unavailable: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
        );
        return;
      }
      throw err;
    }

    const tiles = listRes?.d?.results ?? [];
    expect(Array.isArray(tiles)).toBe(true);
    captureFixture(
      listRes as unknown as Record<string, unknown>,
      'flp/real-tile-list.json',
    );

    // If the system has at least one tile, round-trip it through get().
    const firstId = tiles[0]?.id;
    if (!firstId) {
      console.warn('[E14] No tiles on real system — skipping single-get.');
      return;
    }

    let single: FlpTileResponse;
    try {
      single = await client.adt.flp.tiles.get(firstId);
    } catch (err) {
      if (isUnsupported(err)) {
        console.warn(
          `[E14] get single tile failed: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
        );
        return;
      }
      throw err;
    }

    expect(single?.d?.id).toBe(firstId);
    captureFixture(
      single as unknown as Record<string, unknown>,
      'flp/real-tile-single.json',
    );
  }, 120_000);
});
