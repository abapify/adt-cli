/**
 * CLI + MCP parity tests for `adt strust` / STRUST PSE cert management.
 *
 * Each test drives the same logical operation through both paths and
 * asserts neither side errored. The harness shares a mock ADT server
 * (`@abapify/adt-fixtures`), so both the CLI and MCP tools hit the same
 * fabricated STRUST responses.
 *
 * Fixtures for these routes are TODO-synthetic — see
 * `packages/adt-fixtures/src/fixtures/system/security/*.xml`. sapcli
 * drives STRUST via RFC, not ADT, so no real capture was available.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
} from './index';

const MOCK_PEM =
  '-----BEGIN CERTIFICATE-----\nMIIBIjANmock==\n-----END CERTIFICATE-----\n';

describe('parity: strust', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('list PSEs: CLI `strust list --json` + MCP `list_pses`', async () => {
    const cli = await runCliCommand(harness, ['strust', 'list', '--json']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'list_pses', {});
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('get PSE (list certs): CLI `strust get` + MCP `list_certs`', async () => {
    const cli = await runCliCommand(harness, [
      'strust',
      'get',
      'SSLC',
      'DFAULT',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'list_certs', {
      context: 'SSLC',
      applic: 'DFAULT',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('upload cert: CLI `strust put <pem-file>` + MCP `upload_cert`', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-strust-'));
    const file = join(dir, 'cert.pem');
    writeFileSync(file, MOCK_PEM, 'utf8');

    const cli = await runCliCommand(harness, [
      'strust',
      'put',
      'SSLC',
      'DFAULT',
      file,
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'upload_cert', {
      context: 'SSLC',
      applic: 'DFAULT',
      pem: MOCK_PEM,
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('delete without -y is a no-op (CLI)', async () => {
    const cli = await runCliCommand(harness, [
      'strust',
      'delete',
      'SSLC',
      'DFAULT',
      '99',
    ]);
    expect(cli.exitCode, cli.stderr).toBe(0);
    expect(cli.stdout.toLowerCase()).toContain('pass -y');
  });

  it('delete cert: CLI `strust delete -y` + MCP `delete_cert`', async () => {
    const cli = await runCliCommand(harness, [
      'strust',
      'delete',
      'SSLC',
      'DFAULT',
      '1',
      '-y',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_cert', {
      context: 'SSLC',
      applic: 'DFAULT',
      certId: '1',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('upload rejects non-PEM input (CLI)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adt-parity-strust-bad-'));
    const file = join(dir, 'not-a-cert.bin');
    writeFileSync(file, 'this is not PEM', 'utf8');

    const cli = await runCliCommand(harness, [
      'strust',
      'put',
      'SSLC',
      'DFAULT',
      file,
    ]);
    expect(cli.exitCode).not.toBe(0);
  });

  it('upload rejects non-PEM input (MCP)', async () => {
    const mcp = await callMcpTool(harness, 'upload_cert', {
      context: 'SSLC',
      applic: 'DFAULT',
      pem: 'this is not PEM',
    });
    expect(mcp.isError).toBe(true);
  });
});
