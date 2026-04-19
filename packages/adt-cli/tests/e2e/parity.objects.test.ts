/**
 * CLI + MCP parity tests for object CRUD (class, program, interface)
 * and package commands.
 *
 * For every operation the test:
 *   1. Runs the CLI command via `runCliCommand` and expects exitCode 0.
 *   2. Calls the equivalent MCP tool and expects `isError: false`.
 *
 * Tests must be independent of ordering — every `it` runs both paths
 * for a single operation.
 *
 * NOTE: Some CLI affordances documented in the task brief don't exist
 * in the real CLI (e.g. `--force`, `--source`, `--package`/`--description`
 * flags on `class create`). Those are either adapted to the actual CLI
 * surface (`-y`, positional args) or marked as `it.todo` where there is
 * no equivalent.
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

describe('CLI + MCP parity (objects & packages)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  // ── Class ──────────────────────────────────────────────────────────────

  it('parity: read class', async () => {
    const cli = await runCliCommand(harness, ['class', 'read', 'ZCL_EXAMPLE']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_source', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create class', async () => {
    // CLI: `class create <name> <description> <package>` (positional)
    const cli = await runCliCommand(harness, [
      'class',
      'create',
      'ZCL_NEW',
      'Test',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_object', {
      objectType: 'CLAS',
      objectName: 'ZCL_NEW',
      packageName: '$TMP',
      description: 'Test',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: write class source', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-'));
    const file = join(dir, 'zcl_example.abap');
    writeFileSync(
      file,
      'CLASS zcl_example IMPLEMENTATION.\nENDCLASS.\n',
      'utf8',
    );
    const cli = await runCliCommand(harness, [
      'class',
      'write',
      'ZCL_EXAMPLE',
      file,
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'update_source', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
      sourceCode: 'CLASS zcl_example IMPLEMENTATION.\nENDCLASS.\n',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: activate class', async () => {
    const cli = await runCliCommand(harness, [
      'class',
      'activate',
      'ZCL_EXAMPLE',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete class', async () => {
    // CLI uses `-y` (not `--force`) to skip confirmation.
    const cli = await runCliCommand(harness, [
      'class',
      'delete',
      'ZCL_NEW',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_object', {
      objectType: 'CLAS',
      objectName: 'ZCL_NEW',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  // ── Program ────────────────────────────────────────────────────────────

  it('parity: read program', async () => {
    const cli = await runCliCommand(harness, [
      'program',
      'read',
      'ZPROG_EXAMPLE',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_source', {
      objectName: 'ZPROG_EXAMPLE',
      objectType: 'PROG',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create program', async () => {
    const cli = await runCliCommand(harness, [
      'program',
      'create',
      'ZPROG_NEW',
      'Test',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_object', {
      objectType: 'PROG',
      objectName: 'ZPROG_NEW',
      packageName: '$TMP',
      description: 'Test',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete program', async () => {
    const cli = await runCliCommand(harness, [
      'program',
      'delete',
      'ZPROG_NEW',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_object', {
      objectType: 'PROG',
      objectName: 'ZPROG_NEW',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  // ── Interface ──────────────────────────────────────────────────────────

  it('parity: read interface', async () => {
    const cli = await runCliCommand(harness, [
      'interface',
      'read',
      'ZIF_EXAMPLE',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_source', {
      objectName: 'ZIF_EXAMPLE',
      objectType: 'INTF',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create interface', async () => {
    const cli = await runCliCommand(harness, [
      'interface',
      'create',
      'ZIF_NEW',
      'Test',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_object', {
      objectType: 'INTF',
      objectName: 'ZIF_NEW',
      packageName: '$TMP',
      description: 'Test',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  // ── Package ────────────────────────────────────────────────────────────

  it('parity: create package', async () => {
    // CLI: `package create <name> <description>` (positional, no --description)
    const cli = await runCliCommand(harness, [
      'package',
      'create',
      '$ZTMP_TEST',
      'Test',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_package', {
      packageName: '$ZTMP_TEST',
      description: 'Test',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: list package objects', async () => {
    const cli = await runCliCommand(harness, ['package', 'list', '$TMP']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'list_package_objects', {
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: get package', async () => {
    // Top-level path: `adt get package <name>` (legacy alias for package get)
    const cli = await runCliCommand(harness, ['get', 'package', '$TMP']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_package', {
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: stat package', async () => {
    const cli = await runCliCommand(harness, ['package', 'stat', '$TMP']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'stat_package', {
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: activate package', async () => {
    const cli = await runCliCommand(harness, ['package', 'activate', '$TMP']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_package', {
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete package', async () => {
    const cli = await runCliCommand(harness, [
      'package',
      'delete',
      '$ZTMP_TEST',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_object', {
      objectType: 'DEVC',
      objectName: '$ZTMP_TEST',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });
});
