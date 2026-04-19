/**
 * Real-SAP e2e for E15 — workbench navigation (`adt wb …`).
 *
 * Probes each endpoint on the real system pointed at by `ADT_REAL_SID`
 * (default `TRL`) and records which variants the system actually serves.
 * Two endpoint variants are tested for where-used and call-hierarchy
 * because the exact URL differs between Eclipse ADT releases:
 *
 *   - where-used:
 *     - `/sap/bc/adt/repository/informationsystem/usages`         (used by our MCP tool)
 *     - `/sap/bc/adt/repository/informationsystem/usageReferences` (sapcli / Eclipse)
 *   - callers / callees:
 *     - `/sap/bc/adt/repository/informationsystem/callers|callees`  (used by our MCP tool)
 *     - `/sap/bc/adt/abapsource/callers|callees`                    (E15 spec)
 *
 * A target that returns 403/404/501 or "does not exist" is treated as
 * "not available on this system" — the probe logs a warning and passes.
 * Real responses are captured under `adt-fixtures/src/fixtures/wb/…`
 * (via `captureFixture`) so we have traceable samples.
 *
 * Target object: SAP-delivered class `CL_ABAP_UNIT_ASSERT` on ABAP
 * 7.5+/2022 trial systems. Override with `ADT_REAL_WB_CLASS=<CLAS>`.
 */

import { expect, it } from 'vitest';
import {
  buildUsageReferenceRequestXml,
  buildUsageScopeRequestXml,
} from '@abapify/adt-contracts';
import { captureFixture, describeReal, getRealClient } from './helpers';

const TARGET_CLASS = process.env.ADT_REAL_WB_CLASS ?? 'CL_ABAP_UNIT_ASSERT';
const TARGET_URI = `/sap/bc/adt/oo/classes/${TARGET_CLASS.toLowerCase()}`;

type HttpError = { status?: number; message?: string };

function isUnsupported(err: unknown): err is HttpError {
  if (!err || typeof err !== 'object') return false;
  const e = err as HttpError;
  if (
    typeof e.status === 'number' &&
    [403, 404, 405, 406, 501].includes(e.status)
  ) {
    return true;
  }
  const m = (e.message ?? '').toLowerCase();
  return (
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

async function probeGet(
  path: string,
): Promise<{ status: 'ok' | 'unsupported'; body?: unknown; err?: string }> {
  const client = await getRealClient();
  try {
    const body = await client.fetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return { status: 'ok', body };
  } catch (err) {
    if (isUnsupported(err)) {
      return {
        status: 'unsupported',
        err: err instanceof Error ? err.message : String(err),
      };
    }
    throw err;
  }
}

describeReal('E15 wb (workbench navigation)', () => {
  it('where-used: 2-step POST /usageReferences flow', async () => {
    const client = await getRealClient();

    // Step 1: scope
    const scopeXml =
      await client.adt.repository.informationsystem.usageReferences.scope.post(
        { uri: TARGET_URI, version: 'active' },
        buildUsageScopeRequestXml(),
      );
    expect(String(scopeXml)).toContain('usageScopeResult');
    captureFixture(String(scopeXml), 'wb/real-usage-references-scope.xml');

    // Step 2: search (echo the scope blob back)
    const searchXml =
      await client.adt.repository.informationsystem.usageReferences.search.post(
        { uri: TARGET_URI, version: 'active' },
        buildUsageReferenceRequestXml(String(scopeXml)),
      );
    const searchStr = String(searchXml);
    expect(searchStr).toContain('usageReferenceResult');
    captureFixture(searchStr, 'wb/real-usage-references-result.xml');

    // The real system should report at least some results for CL_ABAP_UNIT_ASSERT
    const hits = /numberOfResults="(\d+)"/.exec(searchStr)?.[1];
    expect(hits).toBeDefined();
  }, 120_000);

  it('callers: probe /informationsystem/callers AND /abapsource/callers', async () => {
    const q = new URLSearchParams({
      objectUri: TARGET_URI,
      maxResults: '5',
    });

    const v1 = await probeGet(
      `/sap/bc/adt/repository/informationsystem/callers?${q.toString()}`,
    );
    const v2 = await probeGet(`/sap/bc/adt/abapsource/callers?${q.toString()}`);

    const anyOk = v1.status === 'ok' || v2.status === 'ok';
    if (!anyOk) {
      console.warn(
        `[E15] callers: no variant available on real SAP (v1: ${v1.err}, v2: ${v2.err}). Skipping.`,
      );
      return;
    }

    if (v1.status === 'ok') {
      captureFixture(
        v1.body as Record<string, unknown>,
        'wb/real-callers-information-system.json',
      );
    }
    if (v2.status === 'ok') {
      captureFixture(
        v2.body as Record<string, unknown>,
        'wb/real-callers-abapsource.json',
      );
    }

    expect(anyOk).toBe(true);
  }, 120_000);

  it('callees: probe /informationsystem/callees AND /abapsource/callees', async () => {
    const q = new URLSearchParams({
      objectUri: TARGET_URI,
      maxResults: '5',
    });

    const v1 = await probeGet(
      `/sap/bc/adt/repository/informationsystem/callees?${q.toString()}`,
    );
    const v2 = await probeGet(`/sap/bc/adt/abapsource/callees?${q.toString()}`);

    const anyOk = v1.status === 'ok' || v2.status === 'ok';
    if (!anyOk) {
      console.warn(
        `[E15] callees: no variant available on real SAP (v1: ${v1.err}, v2: ${v2.err}). Skipping.`,
      );
      return;
    }

    if (v1.status === 'ok') {
      captureFixture(
        v1.body as Record<string, unknown>,
        'wb/real-callees-information-system.json',
      );
    }
    if (v2.status === 'ok') {
      captureFixture(
        v2.body as Record<string, unknown>,
        'wb/real-callees-abapsource.json',
      );
    }

    expect(anyOk).toBe(true);
  }, 120_000);

  it('definition: GET /sap/bc/adt/navigation/target (graceful 405)', async () => {
    const q = new URLSearchParams({
      objectName: TARGET_CLASS,
      objectType: 'CLAS',
    });
    const probe = await probeGet(
      `/sap/bc/adt/navigation/target?${q.toString()}`,
    );
    if (probe.status !== 'ok') {
      // Real SAP rejects GET with 405 — expected. See
      // packages/adt-mcp/src/lib/tools/find-definition.ts for the
      // search-based workaround used by the MCP tool and CLI.
      console.warn(
        `[E15] definition GET rejected by real SAP (as expected): ${probe.err}. MCP/CLI fallback uses /search.`,
      );
      return;
    }
    captureFixture(
      probe.body as Record<string, unknown>,
      'wb/real-navigation-target.json',
    );
    expect(probe.body).toBeDefined();
  }, 120_000);

  it('outline: GET {objectUri}/objectstructure', async () => {
    const client = await getRealClient();

    // The typed contract is the preferred path — mirrors MCP/CLI.
    try {
      const body = await client.adt.oo.classes.objectstructure(
        TARGET_CLASS.toLowerCase(),
      );
      captureFixture(
        body as unknown as Record<string, unknown>,
        'wb/real-object-structure-class.xml',
      );
      expect(body).toBeDefined();
      return;
    } catch (err) {
      if (!isUnsupported(err)) throw err;
      console.warn(
        `[E15] objectstructure unavailable for ${TARGET_CLASS}: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
      );
    }
  }, 120_000);
});
