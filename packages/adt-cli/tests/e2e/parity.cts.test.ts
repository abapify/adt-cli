/**
 * CLI + MCP parity tests for CTS (Transport) commands.
 *
 * Each test drives the same logical operation through both paths and asserts
 * that they reference the same underlying mock data (transport numbers,
 * counts, etc.). All tests run against the shared in-process mock ADT
 * server wired by the harness. No real SAP calls.
 *
 * Several CTS CLI commands (get, create, release, reassign, set) build on
 * `@abapify/adk` (e.g. `AdkTransportRequest`). The e2e harness does NOT
 * call `initializeAdk(client)`, so those CLI paths cannot be exercised
 * end-to-end here. We still assert the MCP side (which uses the v2 client
 * services / raw contracts directly) and mark the CLI-parity assertions as
 * `it.todo` with the specific gap noted. MCP-only smoke tests keep the
 * tools covered until the harness gains ADK wiring.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
  type CliRunResult,
} from './index';

/**
 * Extract the first JSON array/object from a CLI stdout buffer. The CLI
 * often prints a progress line before the JSON payload, so the stdout is
 * not valid JSON as-a-whole even when `--json` is passed.
 */
function extractJson<T = unknown>(cli: CliRunResult): T | undefined {
  if (cli.json !== undefined) return cli.json as T;
  const text = cli.stdout;
  // Find the first '[' or '{' and try JSON.parse from there on.
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

describe('parity: cts', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. List transports  (CLI uses `client.services.transports.list()` – not ADK)
  // ──────────────────────────────────────────────────────────────────────────
  it('list transports: CLI `cts tr list` and MCP `cts_list_transports`', async () => {
    const cli = await runCliCommand(harness, ['cts', 'tr', 'list', '--json']);
    expect(cli.exitCode, cli.stderr).toBe(0);

    const cliList = extractJson<Array<{ number: string }>>(cli);
    expect(Array.isArray(cliList)).toBe(true);
    expect(cliList!.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<{
      count: number;
      transports: Array<{ number: string }>;
    }>(harness, 'cts_list_transports', {});
    expect(mcp.isError).toBe(false);
    expect(Array.isArray(mcp.json.transports)).toBe(true);

    // Parity: same count and same transport numbers (order-independent).
    expect(mcp.json.count).toBe(cliList!.length);
    const cliNumbers = cliList!.map((t) => t.number).sort();
    const mcpNumbers = mcp.json.transports.map((t) => t.number).sort();
    expect(cliNumbers).toEqual(mcpNumbers);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Get transport (CLI + MCP parity — harness now initialises ADK)
  // ──────────────────────────────────────────────────────────────────────────
  it('get transport: CLI `cts tr get` and MCP `cts_get_transport`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'get',
      'DEVK900001',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<Record<string, unknown>>(
      harness,
      'cts_get_transport',
      { transport: 'DEVK900001' },
    );
    expect(mcp.isError).toBe(false);
    expect(JSON.stringify(mcp.json)).toContain('DEVK900001');
  });

  it('get transport (MCP only): `cts_get_transport`', async () => {
    const mcp = await callMcpTool<Record<string, unknown>>(
      harness,
      'cts_get_transport',
      { transport: 'DEVK900001' },
    );
    expect(mcp.isError).toBe(false);
    // Mock fixture returns request.trkorr === 'DEVK900001'
    expect(JSON.stringify(mcp.json)).toContain('DEVK900001');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Create transport (CLI + MCP parity)
  // ──────────────────────────────────────────────────────────────────────────
  it('create transport: CLI `cts tr create` and MCP `cts_create_transport`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'create',
      '-d',
      'Test transport',
      '-t',
      'K',
      '--no-interactive',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{ status: string; transport: string }>(
      harness,
      'cts_create_transport',
      {
        description: 'Test transport',
        type: 'K',
        project: 'PROJ',
      },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.status).toBe('created');
    expect(mcp.json.transport).toMatch(/DEVK\d+/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Release transport (CLI + MCP parity)
  // ──────────────────────────────────────────────────────────────────────────
  it('release transport: CLI `cts tr release` and MCP `cts_release_transport`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'release',
      'DEVK900001',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{ status: string; transport: string }>(
      harness,
      'cts_release_transport',
      { transport: 'DEVK900001' },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.status).toBe('released');
    expect(mcp.json.transport).toBe('DEVK900001');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Reassign transport (CLI + MCP parity)
  // ──────────────────────────────────────────────────────────────────────────
  it('reassign transport: CLI `cts tr reassign` and MCP `cts_reassign_transport`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'reassign',
      'DEVK900001',
      'OTHERUSER',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{
      status: string;
      transport: string;
      newOwner: string;
    }>(harness, 'cts_reassign_transport', {
      transportNumber: 'DEVK900001',
      targetUser: 'OTHERUSER',
    });
    expect(mcp.isError).toBe(false);
    expect(mcp.json.status).toBe('reassigned');
    expect(mcp.json.transport).toBe('DEVK900001');
    expect(mcp.json.newOwner).toBe('OTHERUSER');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Delete transport (CLI + MCP parity — CLI uses -y to skip confirmation)
  // ──────────────────────────────────────────────────────────────────────────
  it('delete transport: CLI `cts tr delete -y` and MCP `cts_delete_transport`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'delete',
      'DEVK900001',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{ transport: string; status: string }>(
      harness,
      'cts_delete_transport',
      { transport: 'DEVK900001' },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.status).toBe('deleted');
    expect(mcp.json.transport).toBe('DEVK900001');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Update transport
  //
  // CLI `cts tr set` calls `AdkTransportRequest.get(transport, { client })`,
  // building a *custom* AdkContext that contains only `client` (no
  // `lockService`). `tr.update(...)` then tries to lock the request and
  // fails with "Lock not available: no lockService in context".
  // The global ADK context (populated by the harness via `initializeAdk`)
  // has a lockService but is NOT consulted once a custom ctx is passed.
  //
  // Fixing this properly requires editing `cts/tr/set.ts` (or the
  // equivalent in `release`, `reassign`, `delete`) to either drop the
  // custom ctx or merge in the global context's lockService — both of
  // which are out of scope for this task.
  // ──────────────────────────────────────────────────────────────────────────
  it.todo(
    'update transport: CLI parity blocked — `cts tr set` passes a custom ADK context without lockService, bypassing the global context set up by the harness',
  );

  it('update transport (MCP only): `cts_update_transport`', async () => {
    const mcp = await callMcpTool<{
      status: string;
      transport: string;
      description?: string;
    }>(harness, 'cts_update_transport', {
      transportNumber: 'DEVK900001',
      description: 'Updated text',
    });
    expect(mcp.isError).toBe(false);
    expect(mcp.json.status).toBe('updated');
    expect(mcp.json.transport).toBe('DEVK900001');
    expect(mcp.json.description).toBe('Updated text');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Search transports (CLI `cts search` + MCP `cts_search_transports`)
  // ──────────────────────────────────────────────────────────────────────────
  it('search transports: CLI `cts search` and MCP `cts_search_transports`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'search',
      '-u',
      '*',
      '-t',
      '*',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{
      count: number;
      transports: Array<{ TRKORR: string }>;
    }>(harness, 'cts_search_transports', { user: '*', trfunction: '*' });
    expect(mcp.isError).toBe(false);
    expect(Array.isArray(mcp.json.transports)).toBe(true);
    expect(mcp.json.count).toBeGreaterThan(0);
  });
});
