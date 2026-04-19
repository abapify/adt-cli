/**
 * CLI + MCP parity tests for RAP Service Definitions (SRVD/SRV).
 *
 * Targets the `/sap/bc/adt/ddic/srvd/sources` endpoint. Each `it`
 * exercises a single logical operation through both the CLI and the
 * equivalent MCP tool so the two surfaces can never drift in isolation.
 *
 * Covers: read source, create, write source, activate, delete.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
} from './index';

describe('CLI + MCP parity (srvd)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('parity: read SRVD source', async () => {
    const cli = await runCliCommand(harness, [
      'srvd',
      'read',
      'ZUI_MOCK_SRVD',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_srvd', {
      srvdName: 'ZUI_MOCK_SRVD',
      includeSource: true,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create SRVD', async () => {
    const cli = await runCliCommand(harness, [
      'srvd',
      'create',
      'ZUI_NEW',
      'Mock RAP service definition',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_srvd', {
      srvdName: 'ZUI_NEW',
      description: 'Mock RAP service definition',
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Also assert the generic dispatch works for SRVD
    const generic = await callMcpTool(harness, 'create_object', {
      objectType: 'SRVD',
      objectName: 'ZUI_NEW2',
      description: 'Mock',
      packageName: '$TMP',
    });
    expect(generic.isError, JSON.stringify(generic.json)).toBe(false);
  });

  it('parity: write SRVD source', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-srvd-'));
    const file = join(dir, 'zui_mock.srvd.asrvd');
    writeFileSync(
      file,
      'define service ZUI_MOCK_SRVD { expose ZI_MOCK_ROOT; }\n',
      'utf8',
    );

    const cli = await runCliCommand(harness, [
      'srvd',
      'write',
      'ZUI_MOCK_SRVD',
      file,
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'update_source', {
      objectName: 'ZUI_MOCK_SRVD',
      objectType: 'SRVD',
      sourceCode: 'define service ZUI_MOCK_SRVD { expose ZI_MOCK_ROOT; }\n',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: activate SRVD', async () => {
    const cli = await runCliCommand(harness, [
      'srvd',
      'activate',
      'ZUI_MOCK_SRVD',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'ZUI_MOCK_SRVD',
      objectType: 'SRVD',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete SRVD', async () => {
    const cli = await runCliCommand(harness, [
      'srvd',
      'delete',
      'ZUI_NEW',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_srvd', {
      srvdName: 'ZUI_NEW',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Generic dispatch
    const generic = await callMcpTool(harness, 'delete_object', {
      objectType: 'SRVD',
      objectName: 'ZUI_NEW2',
    });
    expect(generic.isError, JSON.stringify(generic.json)).toBe(false);
  });
});
