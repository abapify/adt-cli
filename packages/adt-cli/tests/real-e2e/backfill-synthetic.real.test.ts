/**
 * Backfill sweep: probe TRL for every endpoint that currently has a
 * `TODO-synthetic` fixture, and capture real responses whenever the
 * endpoint is reachable. Inaccessible endpoints log a clear skip reason
 * with status/message — the test still passes, because the point here is
 * to *discover* what the BTP Trial exposes rather than to fail the build.
 *
 * Covered areas (epic references):
 *  - E04 STRUST    — /sap/bc/adt/system/security/pses
 *  - E07 gCTS      — /sap/bc/cts_abapvcs/repository*
 *  - E10 BDEF      — /sap/bc/adt/bo/behaviordefinitions/<name>
 *  - E11 SRVD      — /sap/bc/adt/ddic/srvd/sources/<name>
 *  - E12 SRVB      — /sap/bc/adt/businessservices/bindings/<name>
 *
 * Captured artefacts are written as `real-*.<ext>` siblings of the
 * synthetic fixtures under `packages/adt-fixtures/src/fixtures/…` so a
 * reviewer can compare shape and decide whether the synthetic placeholder
 * can be promoted.
 *
 * READ-ONLY only — every call is a GET.
 */

import { expect, it } from 'vitest';
import { captureFixture, describeReal, getRealClient } from './helpers';

type HttpError = { status?: number; message?: string };

function isUnavailable(err: unknown): err is HttpError {
  if (!err || typeof err !== 'object') return false;
  const e = err as HttpError;
  if (
    typeof e.status === 'number' &&
    [401, 403, 404, 405, 406, 501].includes(e.status)
  ) {
    return true;
  }
  const m = (e.message ?? '').toLowerCase();
  return (
    m.includes('http 401') ||
    m.includes('http 403') ||
    m.includes('http 404') ||
    m.includes('http 405') ||
    m.includes('http 406') ||
    m.includes('http 501') ||
    m.includes('does not exist') ||
    m.includes('forbidden') ||
    m.includes('not found') ||
    m.includes('method not allowed') ||
    m.includes('not acceptable')
  );
}

interface ProbeResult {
  ok: boolean;
  body?: unknown;
  error?: string;
}

async function probeGet(
  path: string,
  accept = 'application/xml',
): Promise<ProbeResult> {
  const client = await getRealClient();
  try {
    const body = await client.fetch(path, {
      method: 'GET',
      headers: { Accept: accept },
    });
    return { ok: true, body };
  } catch (err) {
    if (isUnavailable(err)) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    throw err;
  }
}

describeReal('Backfill sweep — synthetic fixtures', () => {
  // ───────────────────────────── E04 STRUST ─────────────────────────────
  it('E04 STRUST — /sap/bc/adt/system/security/pses', async () => {
    const probe = await probeGet(
      '/sap/bc/adt/system/security/pses',
      'application/atom+xml',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[E04 STRUST] pses list unavailable on TRL: ${probe.error}`);
      return;
    }
    captureFixture(probe.body as string, 'system/security/real-pse-list.xml');
    expect(probe.body).toBeDefined();
  }, 60_000);

  // ───────────────────────────── E07 gCTS ───────────────────────────────
  it('E07 gCTS — GET /sap/bc/cts_abapvcs/repository', async () => {
    const probe = await probeGet(
      '/sap/bc/cts_abapvcs/repository',
      'application/json',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[E07 gCTS] repositories list unavailable on TRL: ${probe.error}`,
      );
      return;
    }
    captureFixture(
      probe.body as Record<string, unknown>,
      'gcts/real-repositories.json',
    );
    expect(probe.body).toBeDefined();
  }, 60_000);

  it('E07 gCTS — GET /sap/bc/cts_abapvcs/config', async () => {
    // Secondary probe — exposes some non-repo gCTS metadata on systems
    // where the main /repository endpoint is gated.
    const probe = await probeGet(
      '/sap/bc/cts_abapvcs/config',
      'application/json',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[E07 gCTS] config endpoint unavailable on TRL: ${probe.error}`,
      );
      return;
    }
    captureFixture(
      probe.body as Record<string, unknown>,
      'gcts/real-config.json',
    );
    expect(probe.body).toBeDefined();
  }, 60_000);

  // ───────────────────────────── E10 BDEF ───────────────────────────────
  it('E10 BDEF — /sap/bc/adt/bo/behaviordefinitions/<name>', async () => {
    const candidate = process.env.ADT_REAL_BDEF_NAME ?? 'I_BUPA_BEHAVIOR';
    const probe = await probeGet(
      `/sap/bc/adt/bo/behaviordefinitions/${candidate.toLowerCase()}`,
      'application/vnd.sap.adt.bo.behaviordefinitions.v1+xml',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[E10 BDEF] ${candidate} unavailable on TRL: ${probe.error}. Override via ADT_REAL_BDEF_NAME.`,
      );
      return;
    }
    captureFixture(probe.body as string, 'bo/bdef/real-single.xml');
    expect(probe.body).toBeDefined();
  }, 60_000);

  // ───────────────────────────── E11 SRVD ───────────────────────────────
  it('E11 SRVD — /sap/bc/adt/ddic/srvd/sources/<name>', async () => {
    const candidate = process.env.ADT_REAL_SRVD_NAME ?? 'UI_FLIGHT';
    const probe = await probeGet(
      `/sap/bc/adt/ddic/srvd/sources/${candidate.toLowerCase()}`,
      'application/vnd.sap.adt.ddic.srvd.v1+xml',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[E11 SRVD] ${candidate} unavailable on TRL: ${probe.error}. Override via ADT_REAL_SRVD_NAME.`,
      );
      return;
    }
    captureFixture(probe.body as string, 'ddic/srvd/real-single.xml');
    expect(probe.body).toBeDefined();
  }, 60_000);

  // ───────────────────────────── E12 SRVB ───────────────────────────────
  it('E12 SRVB — /sap/bc/adt/businessservices/bindings/<name>', async () => {
    const candidate = process.env.ADT_REAL_SRVB_NAME ?? 'UI_FLIGHT_O4';
    const probe = await probeGet(
      `/sap/bc/adt/businessservices/bindings/${candidate.toLowerCase()}`,
      'application/vnd.sap.adt.businessservices.bindings.v1+xml',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[E12 SRVB] ${candidate} unavailable on TRL: ${probe.error}. Override via ADT_REAL_SRVB_NAME.`,
      );
      return;
    }
    captureFixture(probe.body as string, 'businessservices/real-binding.xml');
    expect(probe.body).toBeDefined();
  }, 60_000);

  it('E12 SRVB — /sap/bc/adt/businessservices/bindings/<name>/publishedstates', async () => {
    const candidate = process.env.ADT_REAL_SRVB_NAME ?? 'UI_FLIGHT_O4';
    const probe = await probeGet(
      `/sap/bc/adt/businessservices/bindings/${candidate.toLowerCase()}/publishedstates`,
      'application/xml',
    );
    if (!probe.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[E12 SRVB] ${candidate}/publishedstates unavailable on TRL: ${probe.error}`,
      );
      return;
    }
    captureFixture(
      probe.body as string,
      'businessservices/real-binding-publishedstates.xml',
    );
    expect(probe.body).toBeDefined();
  }, 60_000);
});
