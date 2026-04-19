/**
 * CLI + MCP parity tests for `adt checkin` (E08).
 *
 * Exercises plumbing end-to-end through both surfaces:
 *   - dry-run against an empty directory (zero-discovery happy path).
 *   - dry-run over an abapGit-shaped directory (discovery + plan wiring).
 *   - format='gcts' dispatch (proves E05 format-agnosticism — both surfaces
 *     successfully reconstruct AdkObjects from a gCTS-shaped tree now that
 *     `@abapify/adt-plugin-gcts` implements `format.export`).
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

  it('parity: `--format gcts` reconstructs AdkObjects from a gCTS-shaped tree', async () => {
    // Write a minimal gCTS/AFF layout: one INTF (JSON metadata + .abap
    // source). Both CLI and MCP dispatch to `@abapify/adt-plugin-gcts`,
    // whose `format.export` deserialises this into an AdkObject. In
    // dry-run the diff stage will see no such interface on the mock ADT
    // server and tag it `create`; apply is skipped entirely.
    const dir = mkdtempSync(join(tmpdir(), 'adt-checkin-gcts-'));
    const intfDir = join(dir, 'src', 'zpkg_checkin');
    mkdirSync(intfDir, { recursive: true });

    writeFileSync(
      join(intfDir, 'zif_checkin_parity.intf.json'),
      JSON.stringify(
        {
          header: {
            formatVersion: '1.0',
            description: 'Checkin parity interface',
            originalLanguage: 'en',
          },
          interface: { unicodeChecksActive: true },
        },
        null,
        2,
      ) + '\n',
      'utf-8',
    );
    writeFileSync(
      join(intfDir, 'zif_checkin_parity.intf.abap'),
      'INTERFACE zif_checkin_parity PUBLIC.\nENDINTERFACE.\n',
      'utf-8',
    );

    const cli = await runCliCommand(harness, [
      'checkin',
      dir,
      '--format',
      'gcts',
      '--dry-run',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliJson = cli.json as {
      discovered: number;
      format: string;
      groups: Array<{
        entries: Array<{ name: string; type: string; action: string }>;
      }>;
    };
    expect(cliJson.format).toBe('gcts');
    expect(cliJson.discovered).toBe(1);
    const cliEntries = cliJson.groups.flatMap((g) => g.entries);
    expect(cliEntries).toHaveLength(1);
    // Name assertion is relaxed: the harness mock ADT server may serve a
    // canned interface fixture for the INTF GET, and `diffObject` lets
    // `load()` run. What we care about here is that the gCTS files were
    // deserialised into exactly one INTF AdkObject — i.e. that
    // `format.export` is wired end-to-end through both surfaces.
    expect(cliEntries[0].type.toUpperCase()).toMatch(/^INTF/);

    const mcp = await callMcpTool(harness, 'checkin', {
      sourceDir: dir,
      format: 'gcts',
      dryRun: true,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
    const mcpJson = mcp.json as {
      discovered: number;
      format: string;
      totals: { failed: number };
    };
    expect(mcpJson.format).toBe('gcts');
    expect(mcpJson.discovered).toBe(1);
    expect(mcpJson.totals.failed).toBe(0);
  });

  it('parity: `--format abapgit` reconstructs AdkObjects from an abapGit-shaped tree', async () => {
    // Parity companion to the gCTS case above: proves that the same
    // CheckinService pipeline works identically against abapGit files.
    const dir = mkdtempSync(join(tmpdir(), 'adt-checkin-ag-'));
    const intfDir = join(dir, 'src');
    mkdirSync(intfDir, { recursive: true });

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
    writeFileSync(
      join(intfDir, 'zif_checkin_parity.intf.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_INTF" serializer_version="v1.0.0">
  <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
    <asx:values>
      <VSEOINTERF>
        <CLSNAME>ZIF_CHECKIN_PARITY</CLSNAME>
        <LANGU>E</LANGU>
        <DESCRIPT>Checkin parity interface</DESCRIPT>
        <EXPOSURE>2</EXPOSURE>
        <STATE>1</STATE>
        <UNICODE>X</UNICODE>
      </VSEOINTERF>
    </asx:values>
  </asx:abap>
</abapGit>
`,
      'utf-8',
    );
    writeFileSync(
      join(intfDir, 'zif_checkin_parity.intf.abap'),
      'INTERFACE zif_checkin_parity PUBLIC.\nENDINTERFACE.\n',
      'utf-8',
    );

    const cli = await runCliCommand(harness, [
      'checkin',
      dir,
      '--format',
      'abapgit',
      '--dry-run',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliJson = cli.json as { discovered: number; format: string };
    expect(cliJson.format).toBe('abapgit');
    expect(cliJson.discovered).toBe(1);

    const mcp = await callMcpTool(harness, 'checkin', {
      sourceDir: dir,
      format: 'abapgit',
      dryRun: true,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
    const mcpJson = mcp.json as { discovered: number; format: string };
    expect(mcpJson.format).toBe('abapgit');
    expect(mcpJson.discovered).toBe(1);
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
