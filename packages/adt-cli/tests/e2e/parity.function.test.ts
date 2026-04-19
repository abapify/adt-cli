/**
 * CLI + MCP parity tests for ABAP function groups and function modules.
 *
 * Mirrors the structure of parity.include.test.ts but exercises the
 * `/sap/bc/adt/functions/groups` + `/fmodules` endpoints. Each operation
 * is exercised via both the CLI and the equivalent MCP tool so the two
 * surfaces can never drift in isolation.
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

describe('CLI + MCP parity (function group & module)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  // ── group × CRUD ────────────────────────────────────────────────────────
  it('parity: read function group', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'group',
      'read',
      'ZFG_DEMO',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_function_group', {
      groupName: 'ZFG_DEMO',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create function group', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'group',
      'create',
      'ZFG_NEW',
      'Demo group',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_function_group', {
      groupName: 'ZFG_NEW2',
      description: 'Demo group',
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: activate function group', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'group',
      'activate',
      'ZFG_DEMO',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'ZFG_DEMO',
      objectType: 'FUGR',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete function group', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'group',
      'delete',
      'ZFG_NEW',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_object', {
      objectType: 'FUGR',
      objectName: 'ZFG_NEW2',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  // ── module × CRUD ───────────────────────────────────────────────────────
  it('parity: read function module', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'module',
      'read',
      'ZFG_DEMO',
      'Z_DEMO_FM',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_function', {
      groupName: 'ZFG_DEMO',
      functionName: 'Z_DEMO_FM',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create function module', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'module',
      'create',
      'ZFG_DEMO',
      'Z_NEW_FM',
      'New FM',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_function_module', {
      groupName: 'ZFG_DEMO',
      functionName: 'Z_NEW_FM2',
      description: 'New FM',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: write function module source', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-fm-'));
    const file = join(dir, 'z_demo_fm.abap');
    writeFileSync(file, '* Test FM source\n', 'utf8');

    const cli = await runCliCommand(harness, [
      'function',
      'module',
      'write',
      'ZFG_DEMO',
      'Z_DEMO_FM',
      file,
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
  });

  it('parity: activate function module', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'module',
      'activate',
      'ZFG_DEMO',
      'Z_DEMO_FM',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'Z_DEMO_FM',
      objectType: 'FUGR/FF',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete function module', async () => {
    const cli = await runCliCommand(harness, [
      'function',
      'module',
      'delete',
      'ZFG_DEMO',
      'Z_NEW_FM',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_function_module', {
      groupName: 'ZFG_DEMO',
      functionName: 'Z_NEW_FM2',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });
});
