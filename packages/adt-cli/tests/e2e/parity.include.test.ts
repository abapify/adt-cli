/**
 * CLI + MCP parity tests for ABAP program includes (PROG/I).
 *
 * Mirrors the structure of parity.objects.test.ts but targets the
 * `/sap/bc/adt/programs/includes` endpoint. Each `it` exercises a single
 * logical operation through both the CLI and the equivalent MCP tool so
 * the two surfaces can never drift in isolation.
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

describe('CLI + MCP parity (include)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('parity: read include', async () => {
    const cli = await runCliCommand(harness, [
      'include',
      'read',
      'ZTEST_INCLUDE',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    // Primary parity: direct `get_include` tool (metadata).
    const mcp = await callMcpTool(harness, 'get_include', {
      includeName: 'ZTEST_INCLUDE',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create include', async () => {
    const cli = await runCliCommand(harness, [
      'include',
      'create',
      'ZINCL_NEW',
      'Test',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_object', {
      objectType: 'INCL',
      objectName: 'ZINCL_NEW',
      packageName: '$TMP',
      description: 'Test',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: write include source', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-incl-'));
    const file = join(dir, 'ztest_include.abap');
    writeFileSync(file, '* Test include source\n', 'utf8');

    const cli = await runCliCommand(harness, [
      'include',
      'write',
      'ZTEST_INCLUDE',
      file,
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'update_source', {
      objectName: 'ZTEST_INCLUDE',
      objectType: 'INCL',
      sourceCode: '* Test include source\n',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: activate include', async () => {
    const cli = await runCliCommand(harness, [
      'include',
      'activate',
      'ZTEST_INCLUDE',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'ZTEST_INCLUDE',
      objectType: 'INCL',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete include', async () => {
    const cli = await runCliCommand(harness, [
      'include',
      'delete',
      'ZINCL_NEW',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_object', {
      objectType: 'INCL',
      objectName: 'ZINCL_NEW',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });
});
