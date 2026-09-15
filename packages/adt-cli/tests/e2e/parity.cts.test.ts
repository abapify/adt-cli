/**
 * CLI + MCP parity tests for CTS (Transport) commands.
 *
 * Each test drives the same logical operation through both paths and asserts
 * that they reference the same underlying mock data (transport numbers,
 * counts, etc.). All tests run against the shared in-process mock ADT
 * server wired by the harness. No real SAP calls.
 *
 * Several CTS CLI commands build on `@abapify/adk` (for example,
 * `AdkTransportRequest`). The e2e harness initializes the complete ADK
 * context so lock-dependent CLI paths are covered alongside MCP paths.
 */

import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest';
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

  beforeEach(async () => {
    await harness.mock.reset();
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
    const cliNumbers = cliList!
      .map((t) => t.number)
      .sort((a, b) => a.localeCompare(b));
    const mcpNumbers = mcp.json.transports
      .map((t) => t.number)
      .sort((a, b) => a.localeCompare(b));
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

  it('transport metadata: CLI JSON and MCP return the same CTS unit', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'metadata',
      'DEVK900001',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliMetadata = extractJson<{
      requestedTransport: string;
      units: Array<{ number: string }>;
    }>(cli);
    expect(cliMetadata?.requestedTransport).toBe('DEVK900001');

    const mcp = await callMcpTool<{
      requestedTransport: string;
      units: Array<{ number: string }>;
    }>(harness, 'cts_transport_metadata', { transport: 'DEVK900001' });
    expect(mcp.isError).toBe(false);
    expect(mcp.json).toEqual(cliMetadata);
  });

  it('transport metadata for a task returns the task, not its parent request', async () => {
    // SAP returns the parent request and the requested task as siblings;
    // metadata must project the task (DEVK900002), not the parent (DEVK900001).
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'metadata',
      'DEVK900002',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliMetadata = extractJson<{
      requestedTransport: string;
      units: Array<{ number: string; kind: string }>;
    }>(cli);
    expect(cliMetadata?.requestedTransport).toBe('DEVK900002');
    expect(cliMetadata?.units).toHaveLength(1);
    expect(cliMetadata?.units[0]?.number).toBe('DEVK900002');
    expect(cliMetadata?.units[0]?.kind).toBe('task');

    const mcp = await callMcpTool<{
      requestedTransport: string;
      units: Array<{ number: string; kind: string }>;
    }>(harness, 'cts_transport_metadata', { transport: 'DEVK900002' });
    expect(mcp.isError).toBe(false);
    expect(mcp.json).toEqual(cliMetadata);
    expect(mcp.json.units[0]?.number).toBe('DEVK900002');
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

  it('create task: CLI `cts tr task create` and MCP `cts_create_task`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'task',
      'create',
      'DEVK900001',
      'NEWOWNER',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    expect(extractJson(cli)).toEqual({
      status: 'created',
      transport: 'DEVK900001',
      task: 'DEVK900004',
      owner: 'NEWOWNER',
    });

    const secondCli = await runCliCommand(harness, [
      'cts',
      'tr',
      'task',
      'create',
      'DEVK900001',
      'OTHEROWNER',
      '--json',
    ]);
    expect(secondCli.exitCode, secondCli.stderr || secondCli.stdout).toBe(0);
    expect(extractJson(secondCli)).toEqual({
      status: 'created',
      transport: 'DEVK900001',
      task: 'DEVK900005',
      owner: 'OTHEROWNER',
    });

    const releasedTask = await runCliCommand(harness, [
      'cts',
      'tr',
      'release',
      'DEVK900004',
      '--skip-check',
      '--yes',
      '--json',
    ]);
    expect(
      releasedTask.exitCode,
      releasedTask.stderr || releasedTask.stdout,
    ).toBe(0);
    expect(extractJson(releasedTask)).toMatchObject({
      status: 'released',
      transport: 'DEVK900004',
      releaseAll: false,
    });

    await harness.mock.reset();
    const mcp = await callMcpTool<{
      status: string;
      transport: string;
      task: string;
      owner: string;
    }>(harness, 'cts_create_task', {
      transport: 'DEVK900001',
      owner: 'NEWOWNER',
    });
    expect(mcp.isError).toBe(false);
    expect(mcp.json).toEqual({
      status: 'created',
      transport: 'DEVK900001',
      task: 'DEVK900004',
      owner: 'NEWOWNER',
    });
  });

  it('task creation failures remain failures through CLI and MCP', async () => {
    harness.mock.setTaskCreationMode('noop');
    const noopCli = await runCliCommand(harness, [
      'cts',
      'tr',
      'task',
      'create',
      'DEVK900001',
      'NEWOWNER',
      '--json',
    ]);
    expect(noopCli.exitCode).toBe(1);
    expect(noopCli.stderr).toContain('no new task owned by NEWOWNER');

    await harness.mock.reset();
    harness.mock.setTaskCreationMode('noop');
    const noopMcp = await callMcpTool(harness, 'cts_create_task', {
      transport: 'DEVK900001',
      owner: 'NEWOWNER',
    });
    expect(noopMcp.isError).toBe(true);
    expect(String(noopMcp.json)).toContain('no new task owned by NEWOWNER');

    await harness.mock.reset();
    const invalidCli = await runCliCommand(harness, [
      'cts',
      'tr',
      'task',
      'create',
      'DEVK900002',
      'NEWOWNER',
      '--json',
    ]);
    expect(invalidCli.exitCode).toBe(1);
    expect(invalidCli.stderr).toContain(
      'Transport DEVK900002 is a task, not a request',
    );

    await harness.mock.reset();
    const invalidMcp = await callMcpTool(harness, 'cts_create_task', {
      transport: 'DEVK900002',
      owner: 'NEWOWNER',
    });
    expect(invalidMcp.isError).toBe(true);
    expect(String(invalidMcp.json)).toContain(
      'Transport DEVK900002 is a task, not a request',
    );
  });

  it('rejects a task creation request without the required target user', async () => {
    await expect(
      harness.client.fetch(
        '/sap/bc/adt/cts/transportrequests/DEVK900001/tasks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.sap.adt.transportorganizer.v1+xml',
          },
          body: '<tm:root xmlns:tm="http://www.sap.com/cts/adt/tm"/>',
        },
      ),
    ).rejects.toThrow(/400/u);
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

    // CLI and MCP must execute the same transition from the same initial SAP
    // state; otherwise the second invocation is correctly idempotent.
    await harness.mock.reset();

    const mcp = await callMcpTool<{ status: string; transport: string }>(
      harness,
      'cts_release_transport',
      { transport: 'DEVK900001' },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.status).toBe('released');
    expect(mcp.json.transport).toBe('DEVK900001');
  });

  it('release-all releases child tasks before their parent request', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'release',
      'DEVK900001',
      '--release-all',
      '--skip-check',
      '--yes',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    expect(extractJson(cli)).toMatchObject({
      status: 'released',
      transport: 'DEVK900001',
      releaseAll: true,
    });
  });

  it('reads an already released sibling task as the task itself', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'release',
      'DEVK900003',
      '--yes',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    expect(extractJson(cli)).toEqual({
      transport: 'DEVK900003',
      status: 'already_released',
    });
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
  // ──────────────────────────────────────────────────────────────────────────
  it('update transport: CLI `cts tr set` uses the initialized lock service', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'set',
      'DEVK900001',
      '--description',
      'Updated text',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    expect(extractJson(cli)).toMatchObject({
      status: 'updated',
      transport: 'DEVK900001',
    });
  });

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

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Objects query (CLI `cts tr objects` + MCP `cts_transport_objects`)
  // ──────────────────────────────────────────────────────────────────────────
  it('objects query: CLI `cts tr objects` and MCP `cts_transport_objects`', async () => {
    const cli = await runCliCommand(harness, [
      'cts',
      'tr',
      'objects',
      'DEVK900001',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const cliJson = extractJson<{
      transports: string[];
      objects: Array<{
        pgmid: string;
        type: string;
        name: string;
        obj_func: string;
      }>;
    }>(cli);
    expect(cliJson).toBeDefined();
    expect(Array.isArray(cliJson!.transports)).toBe(true);
    expect(Array.isArray(cliJson!.objects)).toBe(true);

    const mcp = await callMcpTool<{
      transports: string[];
      objects: Array<{
        pgmid: string;
        type: string;
        name: string;
        obj_func: string;
      }>;
    }>(harness, 'cts_transport_objects', {
      transport: 'DEVK900001',
    });
    expect(mcp.isError).toBe(false);
    expect(Array.isArray(mcp.json.transports)).toBe(true);
    expect(Array.isArray(mcp.json.objects)).toBe(true);

    // Parity: same object count and same object names (order-independent)
    expect(mcp.json.objects).toHaveLength(cliJson!.objects.length);
    const cliNames = cliJson!.objects
      .map((o) => o.name)
      .sort((a, b) => a.localeCompare(b));
    const mcpNames = mcp.json.objects
      .map((o) => o.name)
      .sort((a, b) => a.localeCompare(b));
    expect(cliNames).toEqual(mcpNames);
  });
});
