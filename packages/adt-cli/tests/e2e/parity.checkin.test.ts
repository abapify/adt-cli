/**
 * CLI + MCP parity tests for `adt checkin` (E08).
 *
 * Exercises plumbing end-to-end through both surfaces:
 *   - dry-run against an empty directory (zero-discovery happy path).
 *   - dry-run over an abapGit-shaped directory (discovery + plan wiring).
 *   - format='gcts' dispatch (proves E05 format-agnosticism — both surfaces
 *     fail consistently today because gcts deserialisation is deferred).
 *   - MCP tool is advertised.
 *   - unknown format is rejected — kept LAST because commander retains
 *     option defaults across `parseAsync` invocations.
 *
 * Full SAP-apply paths (lock/ETag/PUT per object type) need richer mock
 * coverage than `@abapify/adt-fixtures` currently offers; those paths are
 * covered by `tests/services/checkin/*` unit tests and the in-process
 * `@abapify/adt-locks` batch-session unit tests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
} from './index';

describe('CLI + MCP parity (checkin)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('parity: checkin tool is advertised in the MCP tool list', async () => {
    const tools = await harness.mcpClient.listTools();
    const checkin = tools.tools.find((t) => t.name === 'checkin');
    expect(checkin, 'checkin tool must be registered').toBeTruthy();
    expect(checkin?.description).toMatch(/push|checkin|SAP/i);
  });

  it('parity: dry-run of empty directory succeeds on both surfaces', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-checkin-empty-'));

    const cli = await runCliCommand(harness, [
      'checkin',
      dir,
      '--dry-run',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'checkin', {
      sourceDir: dir,
      dryRun: true,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    const mcpJson = mcp.json as { discovered: number };
    expect(mcpJson.discovered).toBe(0);
  });

  it('parity: dry-run scans an abapGit-shaped directory and reports 0 failures', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-checkin-scan-'));
    const pkgDir = join(dir, 'src');
    mkdirSync(pkgDir, { recursive: true });
    // Minimal .abapgit.xml so the deserialiser recognises this as a repo.
    writeFileSync(
      join(dir, '.abapgit.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0">
  <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
    <asx:values>
      <DATA>
        <MASTER_LANGUAGE>E</MASTER_LANGUAGE>
        <STARTING_FOLDER>/src/</STARTING_FOLDER>
        <FOLDER_LOGIC>FULL</FOLDER_LOGIC>
      </DATA>
    </asx:values>
  </asx:abap>
</abapGit>
`,
      'utf-8',
    );

    const cli = await runCliCommand(harness, [
      'checkin',
      dir,
      '--dry-run',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'checkin', {
      sourceDir: dir,
      dryRun: true,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    const mcpJson = mcp.json as {
      discovered: number;
      totals: { failed: number };
    };
    expect(mcpJson.totals.failed).toBe(0);
  });

  it('parity: `--format gcts` is plumbed through the FormatPlugin registry', async () => {
    // Both CLI and MCP dispatch to the gCTS plugin. Since the gCTS plugin
    // does not yet implement Git → SAP deserialisation (deferred alongside
    // E08 — see E06 follow-ups), both surfaces MUST fail consistently.
    const dir = mkdtempSync(join(tmpdir(), 'adt-checkin-gcts-'));

    const cli = await runCliCommand(harness, [
      'checkin',
      dir,
      '--format',
      'gcts',
      '--dry-run',
    ]);
    expect(cli.exitCode).toBe(1);
    const cliErr = cli.stderr + cli.stdout;
    expect(cliErr).toMatch(/gcts|format\.export|deserialise/i);

    const mcp = await callMcpTool(harness, 'checkin', {
      sourceDir: dir,
      format: 'gcts',
      dryRun: true,
    });
    expect(mcp.isError).toBe(true);
    const mcpErr = JSON.stringify(mcp.json);
    expect(mcpErr).toMatch(/gcts|format\.export|deserialise/i);
  });

  it('parity: rejects unknown format spec', async () => {
    // Kept LAST: commander retains option defaults across `parseAsync`
    // invocations in the shared harness program.
    const dir = mkdtempSync(join(tmpdir(), 'adt-checkin-bad-'));

    const cli = await runCliCommand(harness, [
      'checkin',
      dir,
      '--format',
      '@abapify/adt-plugin-nonexistent',
      '--dry-run',
    ]);
    expect(cli.exitCode).toBe(1);
    expect(cli.stderr + cli.stdout).toMatch(/not found|Plugin|Cannot find/i);

    const mcp = await callMcpTool(harness, 'checkin', {
      sourceDir: dir,
      format: '@abapify/adt-plugin-nonexistent',
      dryRun: true,
    });
    expect(mcp.isError).toBe(true);
  });
});
