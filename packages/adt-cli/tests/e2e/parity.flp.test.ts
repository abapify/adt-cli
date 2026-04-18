/**
 * CLI + MCP parity tests for FLP (E14).
 *
 * Exercises every FLP read surface through both the CLI (`adt flp …`) and
 * the MCP tool (`list_flp_*` / `get_flp_tile`). Both paths share the same
 * in-process mock ADT server, which serves the Page Builder OData
 * (`/sap/opu/odata/UI2/PAGE_BUILDER_PERS/…`) fixtures from
 * `@abapify/adt-fixtures/fixtures/flp/*.json`.
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

const CATALOG_ID = 'X-SAP-UI2-CATALOGPAGE:SAP_MOCK_DEV_CAT';
const TILE_ID = 'X-SAP-UI2-CHIP:/MOCK/TILE_1';

describe('parity: flp', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('list catalogs: CLI `flp list-catalogs --json` and MCP `list_flp_catalogs`', async () => {
    const cli = await runCliCommand(harness, [
      'flp',
      'list-catalogs',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliList = extractJson<Array<{ id?: string }>>(cli);
    expect(Array.isArray(cliList)).toBe(true);
    expect(cliList!.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<Array<{ id?: string }>>(
      harness,
      'list_flp_catalogs',
      {},
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.map((c) => c.id).sort()).toEqual(
      cliList!.map((c) => c.id).sort(),
    );
  });

  it('list groups: CLI `flp list-groups --json` and MCP `list_flp_groups`', async () => {
    const cli = await runCliCommand(harness, ['flp', 'list-groups', '--json']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliList = extractJson<Array<{ id?: string }>>(cli);
    expect(Array.isArray(cliList)).toBe(true);
    expect(cliList!.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<Array<{ id?: string }>>(
      harness,
      'list_flp_groups',
      {},
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.length).toBe(cliList!.length);
  });

  it('list tiles (global): CLI `flp list-tiles --json` and MCP `list_flp_tiles`', async () => {
    const cli = await runCliCommand(harness, ['flp', 'list-tiles', '--json']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliList = extractJson<Array<{ id?: string }>>(cli);
    expect(Array.isArray(cliList)).toBe(true);
    expect(cliList!.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<Array<{ id?: string }>>(
      harness,
      'list_flp_tiles',
      {},
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.map((t) => t.id).sort()).toEqual(
      cliList!.map((t) => t.id).sort(),
    );
  });

  it('list tiles (by catalog): CLI `flp list-tiles -c <id>` and MCP `list_flp_tiles {catalogId}`', async () => {
    const cli = await runCliCommand(harness, [
      'flp',
      'list-tiles',
      '-c',
      CATALOG_ID,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliList = extractJson<Array<{ id?: string }>>(cli);
    expect(Array.isArray(cliList)).toBe(true);

    const mcp = await callMcpTool<Array<{ id?: string }>>(
      harness,
      'list_flp_tiles',
      { catalogId: CATALOG_ID },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.length).toBe(cliList!.length);
  });

  it('get tile: CLI `flp get-tile <id> --json` and MCP `get_flp_tile`', async () => {
    const cli = await runCliCommand(harness, [
      'flp',
      'get-tile',
      TILE_ID,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliTile = extractJson<{ id?: string; title?: string }>(cli);
    expect(cliTile?.id).toBeTruthy();

    const mcp = await callMcpTool<{ id?: string; title?: string }>(
      harness,
      'get_flp_tile',
      { tileId: TILE_ID },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.id).toBe(cliTile!.id);
    expect(mcp.json.title).toBe(cliTile!.title);
  });
});
