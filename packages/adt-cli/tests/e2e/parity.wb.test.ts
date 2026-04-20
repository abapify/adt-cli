/**
 * CLI + MCP parity tests for `adt wb …` (E15).
 *
 * Exercises every wb surface through both the CLI (`adt wb …`) and the
 * matching MCP tool. Both paths share the same in-process mock ADT
 * server (see `harness.ts`).
 *
 * Routes exercised (served by `@abapify/adt-fixtures` mock):
 *   - GET /sap/bc/adt/repository/informationsystem/usages    → f.usages
 *   - GET /sap/bc/adt/repository/informationsystem/callers   → f.callers
 *   - GET /sap/bc/adt/repository/informationsystem/callees   → f.callees
 *   - GET /sap/bc/adt/navigation/target                      → f.navigationTarget
 *   - GET {objectUri}/objectstructure                        → f.objectStructure
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
  type CliRunResult,
} from './index';

function extractJson<T = unknown>(cli: CliRunResult): T | undefined {
  if (cli.json !== undefined) return cli.json as T;
  const text = cli.stdout;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '[' && ch !== '{') continue;
    try {
      return JSON.parse(text.slice(i)) as T;
    } catch {
      /* keep scanning */
    }
  }
  return undefined;
}

// Pick a class that mock search returns. The mock's `f.search` fixture
// exposes ZCL_EXAMPLE; we pass --type CLAS to deterministically resolve
// the URI via `resolveObjectUriFromType` (no network round-trip).
const OBJECT_NAME = 'ZCL_EXAMPLE';
const OBJECT_TYPE = 'CLAS';
const EXPECTED_URI = '/sap/bc/adt/oo/classes/zcl_example';

describe('parity: wb (E15)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('where-used: CLI `wb where-used --json` and MCP `find_references`', async () => {
    const cli = await runCliCommand(harness, [
      'wb',
      'where-used',
      OBJECT_NAME,
      '-t',
      OBJECT_TYPE,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliPayload = extractJson<{
      objectName: string;
      objectUri: string;
      usages: Array<Record<string, unknown>>;
    }>(cli);
    expect(cliPayload?.objectUri).toBe(EXPECTED_URI);
    expect(cliPayload?.usages?.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<{
      objectName: string;
      objectUri: string;
      results: Array<Record<string, unknown>>;
    }>(harness, 'find_references', {
      objectName: OBJECT_NAME,
      objectType: OBJECT_TYPE,
    });
    expect(mcp.isError).toBe(false);
    expect(mcp.json.objectUri).toBe(cliPayload!.objectUri);
    // Both paths parse the same usageReferenceResult XML — the reference
    // list should match (the key is identity, not field naming).
    expect(mcp.json.results.length).toBe(cliPayload!.usages.length);
  });

  it('callers: CLI `wb callers --json` and MCP `get_callers_of`', async () => {
    const cli = await runCliCommand(harness, [
      'wb',
      'callers',
      OBJECT_NAME,
      '-t',
      OBJECT_TYPE,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliPayload = extractJson<{
      objectUri: string;
      callers: unknown;
    }>(cli);
    expect(cliPayload?.objectUri).toBe(EXPECTED_URI);

    const mcp = await callMcpTool<{ objectUri: string; callers: unknown }>(
      harness,
      'get_callers_of',
      { objectName: OBJECT_NAME, objectType: OBJECT_TYPE },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.objectUri).toBe(cliPayload!.objectUri);
    expect(JSON.stringify(mcp.json.callers)).toBe(
      JSON.stringify(cliPayload!.callers),
    );
  });

  it('callees: CLI `wb callees --json` and MCP `get_callees_of`', async () => {
    const cli = await runCliCommand(harness, [
      'wb',
      'callees',
      OBJECT_NAME,
      '-t',
      OBJECT_TYPE,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliPayload = extractJson<{ objectUri: string; callees: unknown }>(
      cli,
    );
    expect(cliPayload?.objectUri).toBe(EXPECTED_URI);

    const mcp = await callMcpTool<{ objectUri: string; callees: unknown }>(
      harness,
      'get_callees_of',
      { objectName: OBJECT_NAME, objectType: OBJECT_TYPE },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.objectUri).toBe(cliPayload!.objectUri);
    expect(JSON.stringify(mcp.json.callees)).toBe(
      JSON.stringify(cliPayload!.callees),
    );
  });

  it('definition: CLI `wb definition --json` and MCP `find_definition`', async () => {
    const cli = await runCliCommand(harness, [
      'wb',
      'definition',
      OBJECT_NAME,
      '-t',
      OBJECT_TYPE,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliPayload = extractJson<{ uri?: string }>(cli);
    expect(cliPayload?.uri).toBe(EXPECTED_URI);

    const mcp = await callMcpTool<{ uri?: string }>(
      harness,
      'find_definition',
      {
        objectName: OBJECT_NAME,
        objectType: OBJECT_TYPE,
      },
    );
    expect(mcp.isError).toBe(false);

    // Both paths resolve the same target URI (via search); the top-level
    // schema differs slightly but `uri` is the invariant the MCP client
    // cares about.
    expect(mcp.json.uri).toBe(cliPayload?.uri);
  });

  it('outline: CLI `wb outline --json` and MCP `get_object_structure`', async () => {
    const cli = await runCliCommand(harness, [
      'wb',
      'outline',
      OBJECT_NAME,
      '-t',
      OBJECT_TYPE,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliPayload = extractJson<unknown>(cli);
    expect(cliPayload).toBeDefined();

    const mcp = await callMcpTool<unknown>(harness, 'get_object_structure', {
      objectName: OBJECT_NAME,
      objectType: OBJECT_TYPE,
    });
    expect(mcp.isError).toBe(false);
    expect(JSON.stringify(cliPayload)).toBe(JSON.stringify(mcp.json));
  });
});
