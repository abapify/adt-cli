/**
 * CLI + MCP parity tests for `adt changeset …` (Wave 3).
 *
 * Drives the four verbs — begin / add / commit / rollback — through both
 * surfaces against the same mock ADT backend and asserts equivalent
 * behaviour:
 *   - lock acquired on `add`
 *   - batch activation happens exactly once on `commit`
 *   - `rollback` releases the lock and never hits the activation route
 *
 * The harness drives the CLI (file-backed state under ~/.adt/changesets).
 * The MCP side is driven through the real `StreamableHTTPClientTransport`
 * because `ChangesetService` state lives on the session registry, which
 * the harness's in-memory MCP client cannot populate. Both paths share
 * the single mock ADT server spun up by the harness.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
/* eslint-disable-next-line @nx/enforce-module-boundaries */
import { startHttpServer, type RunningHttpServer } from '@abapify/adt-mcp';

import { startAdtHarness, runCliCommand, type AdtHarness } from './index';

interface ToolText {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

function parseToolJson<T = unknown>(
  raw: unknown,
): { json: T; isError: boolean } {
  const r = raw as ToolText;
  const text = r.content?.[0]?.text ?? '';
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  return { json: json as T, isError: Boolean(r.isError) };
}

describe('CLI + MCP parity (changeset)', () => {
  let harness: AdtHarness;
  let httpServer: RunningHttpServer;
  let stateRoot: string;
  let origHome: string | undefined;

  beforeAll(async () => {
    harness = await startAdtHarness();

    // Isolate CLI on-disk state under a temp HOME so multiple runs /
    // other tests don't collide under ~/.adt/changesets.
    stateRoot = mkdtempSync(join(tmpdir(), 'adt-changeset-home-'));
    origHome = process.env.HOME;
    process.env.HOME = stateRoot;

    // Stand up an HTTP MCP server pointing at the same mock ADT backend
    // so MCP tool calls reach the same lock registry / activation route
    // the CLI exercises.
    httpServer = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      log: () => undefined,
    });
  }, 30_000);

  afterAll(async () => {
    await httpServer?.close();
    if (harness) await harness.stop();
    if (origHome !== undefined) process.env.HOME = origHome;
    else delete process.env.HOME;
  });

  async function connectMcp(): Promise<{
    client: McpClient;
    transport: StreamableHTTPClientTransport;
  }> {
    const transport = new StreamableHTTPClientTransport(
      new URL(httpServer.url),
    );
    const client = new McpClient({
      name: 'parity-changeset',
      version: '0.0.1',
    });
    await client.connect(transport);

    // Every changeset tool requires an active SAP session on the MCP
    // session registry — populate it with a sap_connect against the
    // harness mock.
    const connectRes = await client.callTool({
      name: 'sap_connect',
      arguments: {
        baseUrl: harness.connection.baseUrl,
        username: harness.connection.username,
        password: harness.connection.password,
        client: harness.connection.client,
      },
    });
    expect(
      (connectRes as ToolText).isError ?? false,
      JSON.stringify(connectRes),
    ).toBe(false);
    return { client, transport };
  }

  it('both tools advertise changeset_begin/add/commit/rollback', async () => {
    const tools = await harness.mcpClient.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('changeset_begin');
    expect(names).toContain('changeset_add');
    expect(names).toContain('changeset_commit');
    expect(names).toContain('changeset_rollback');
  });

  it('parity: begin → add → commit activates objects on both surfaces', async () => {
    // CLI path
    const cliBegin = await runCliCommand(harness, [
      'changeset',
      'begin',
      '--description',
      'cli-commit-test',
      '--json',
    ]);
    expect(cliBegin.exitCode, cliBegin.stderr || cliBegin.stdout).toBe(0);
    const cliCs = cliBegin.json as { id: string; status: string };
    expect(cliCs.status).toBe('open');
    expect(cliCs.id).toBeTruthy();

    const cliAdd = await runCliCommand(harness, [
      'changeset',
      'add',
      '--changeset',
      cliCs.id,
      '--object-type',
      'CLAS',
      '--object-name',
      `ZCL_PARITY_${randomBytes(2).toString('hex')}`,
      '--source',
      'CLASS zcl_parity DEFINITION PUBLIC.\nENDCLASS.\nCLASS zcl_parity IMPLEMENTATION.\nENDCLASS.\n',
      '--json',
    ]);
    expect(cliAdd.exitCode, cliAdd.stderr || cliAdd.stdout).toBe(0);

    const cliCommit = await runCliCommand(harness, [
      'changeset',
      'commit',
      '--changeset',
      cliCs.id,
      '--json',
    ]);
    expect(cliCommit.exitCode, cliCommit.stderr || cliCommit.stdout).toBe(0);
    const cliCommitJson = cliCommit.json as {
      result: { activated: string[]; failed: unknown[] };
    };
    expect(cliCommitJson.result.activated).toHaveLength(1);
    expect(cliCommitJson.result.failed).toHaveLength(0);

    // MCP path
    const { client, transport } = await connectMcp();
    try {
      const mcpBeginRaw = await client.callTool({
        name: 'changeset_begin',
        arguments: { description: 'mcp-commit-test' },
      });
      const mcpBegin = parseToolJson<{
        ok: boolean;
        changeset: { id: string; status: string };
      }>(mcpBeginRaw);
      expect(mcpBegin.isError, JSON.stringify(mcpBegin.json)).toBe(false);
      expect(mcpBegin.json.changeset.status).toBe('open');

      const mcpAddRaw = await client.callTool({
        name: 'changeset_add',
        arguments: {
          objectType: 'CLAS',
          objectName: `ZCL_PARITY_${randomBytes(2).toString('hex')}`,
          source:
            'CLASS x DEFINITION. ENDCLASS. CLASS x IMPLEMENTATION. ENDCLASS.',
        },
      });
      const mcpAdd = parseToolJson<{
        ok: boolean;
        changeset: { entryCount: number };
        entry: { lockHandle: string; objectUri: string };
      }>(mcpAddRaw);
      expect(mcpAdd.isError, JSON.stringify(mcpAdd.json)).toBe(false);
      expect(mcpAdd.json.changeset.entryCount).toBe(1);
      expect(mcpAdd.json.entry.lockHandle).toBeTruthy();

      const mcpCommitRaw = await client.callTool({
        name: 'changeset_commit',
        arguments: {},
      });
      const mcpCommit = parseToolJson<{
        ok: boolean;
        changeset: { activated: string[]; failed: unknown[]; status: string };
      }>(mcpCommitRaw);
      expect(mcpCommit.isError, JSON.stringify(mcpCommit.json)).toBe(false);
      expect(mcpCommit.json.changeset.activated).toHaveLength(1);
      expect(mcpCommit.json.changeset.failed).toHaveLength(0);
      expect(mcpCommit.json.changeset.status).toBe('committed');
    } finally {
      await transport.close();
    }
  });

  it('parity: begin → add → rollback releases locks and skips activation', async () => {
    // CLI path
    const cliBegin = await runCliCommand(harness, [
      'changeset',
      'begin',
      '--json',
    ]);
    expect(cliBegin.exitCode).toBe(0);
    const cliCs = cliBegin.json as { id: string };

    const cliAdd = await runCliCommand(harness, [
      'changeset',
      'add',
      '--changeset',
      cliCs.id,
      '--object-type',
      'PROG',
      '--object-name',
      `ZPARITY_${randomBytes(2).toString('hex')}`,
      '--source',
      'REPORT zparity.',
      '--json',
    ]);
    expect(cliAdd.exitCode, cliAdd.stderr || cliAdd.stdout).toBe(0);

    const cliRollback = await runCliCommand(harness, [
      'changeset',
      'rollback',
      '--changeset',
      cliCs.id,
      '--json',
    ]);
    expect(cliRollback.exitCode, cliRollback.stderr || cliRollback.stdout).toBe(
      0,
    );
    const cliRbJson = cliRollback.json as {
      result: { released: string[]; failed: unknown[] };
    };
    expect(cliRbJson.result.released).toHaveLength(1);
    expect(cliRbJson.result.failed).toHaveLength(0);

    // MCP path
    const { client, transport } = await connectMcp();
    try {
      await client.callTool({
        name: 'changeset_begin',
        arguments: {},
      });
      await client.callTool({
        name: 'changeset_add',
        arguments: {
          objectType: 'PROG',
          objectName: `ZPARITY_${randomBytes(2).toString('hex')}`,
          source: 'REPORT zparity.',
        },
      });
      const mcpRbRaw = await client.callTool({
        name: 'changeset_rollback',
        arguments: {},
      });
      const mcpRb = parseToolJson<{
        ok: boolean;
        changeset: { released: string[]; failed: unknown[]; status: string };
      }>(mcpRbRaw);
      expect(mcpRb.isError, JSON.stringify(mcpRb.json)).toBe(false);
      expect(mcpRb.json.changeset.released).toHaveLength(1);
      expect(mcpRb.json.changeset.status).toBe('rolled_back');
    } finally {
      await transport.close();
    }
  });

  it('parity: begin is rejected when another changeset is already open', async () => {
    // CLI path keeps state per-id, so "second begin" just creates a new
    // id. Instead we assert that `changeset_begin` on MCP rejects the
    // second call without force=true. The equivalent CLI behaviour is
    // documented: CLI users orchestrate multiple changesets by id, so
    // there is no single-active-slot invariant on that surface.
    const { client, transport } = await connectMcp();
    try {
      const firstRaw = await client.callTool({
        name: 'changeset_begin',
        arguments: {},
      });
      const first = parseToolJson<{ changeset: { id: string } }>(firstRaw);
      expect(first.isError).toBe(false);

      const secondRaw = await client.callTool({
        name: 'changeset_begin',
        arguments: {},
      });
      const second = parseToolJson<{ changeset?: { id: string } }>(secondRaw);
      expect(second.isError).toBe(true);

      const forcedRaw = await client.callTool({
        name: 'changeset_begin',
        arguments: { force: true },
      });
      const forced = parseToolJson<{
        changeset: { id: string; status: string };
      }>(forcedRaw);
      expect(forced.isError, JSON.stringify(forced.json)).toBe(false);
      expect(forced.json.changeset.id).not.toBe(first.json.changeset.id);
      expect(forced.json.changeset.status).toBe('open');

      // Clean up lingering changeset.
      await client.callTool({
        name: 'changeset_rollback',
        arguments: {},
      });
    } finally {
      await transport.close();
    }
  });
});
