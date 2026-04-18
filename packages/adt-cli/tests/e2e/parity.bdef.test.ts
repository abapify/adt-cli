/**
 * CLI + MCP parity tests for RAP Behavior Definitions (BDEF/BDO).
 *
 * Targets the `/sap/bc/adt/bo/behaviordefinitions` endpoint. Each `it`
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

describe('CLI + MCP parity (bdef)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('parity: read BDEF source', async () => {
    const cli = await runCliCommand(harness, [
      'bdef',
      'read',
      'ZBP_MOCK_BDEF',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_bdef', {
      bdefName: 'ZBP_MOCK_BDEF',
      includeSource: true,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create BDEF', async () => {
    const cli = await runCliCommand(harness, [
      'bdef',
      'create',
      'ZBP_NEW',
      'Mock RAP behavior definition',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_bdef', {
      bdefName: 'ZBP_NEW',
      description: 'Mock RAP behavior definition',
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Also assert the generic dispatch works for BDEF
    const generic = await callMcpTool(harness, 'create_object', {
      objectType: 'BDEF',
      objectName: 'ZBP_NEW2',
      description: 'Mock',
      packageName: '$TMP',
    });
    expect(generic.isError, JSON.stringify(generic.json)).toBe(false);
  });

  it('parity: write BDEF source', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-bdef-'));
    const file = join(dir, 'zbp_mock.bdef.abdl');
    writeFileSync(
      file,
      'managed implementation in class zbp_mock_bdef unique;\n',
      'utf8',
    );

    const cli = await runCliCommand(harness, [
      'bdef',
      'write',
      'ZBP_MOCK_BDEF',
      file,
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'update_source', {
      objectName: 'ZBP_MOCK_BDEF',
      objectType: 'BDEF',
      sourceCode: 'managed implementation in class zbp_mock_bdef unique;\n',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: activate BDEF', async () => {
    const cli = await runCliCommand(harness, [
      'bdef',
      'activate',
      'ZBP_MOCK_BDEF',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'ZBP_MOCK_BDEF',
      objectType: 'BDEF',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete BDEF', async () => {
    const cli = await runCliCommand(harness, ['bdef', 'delete', 'ZBP_NEW', '-y']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_bdef', {
      bdefName: 'ZBP_NEW',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Generic dispatch
    const generic = await callMcpTool(harness, 'delete_object', {
      objectType: 'BDEF',
      objectName: 'ZBP_NEW2',
    });
    expect(generic.isError, JSON.stringify(generic.json)).toBe(false);
  });
});
