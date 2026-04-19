/**
 * CLI + MCP parity tests for miscellaneous operations:
 * syntax check, OSQL query, ABAP run, user lookup, lock/unlock,
 * source get/put, system info, discovery.
 *
 * Parameter names in some MCP tools differ from the task spec –
 * tests use the actual tool parameter names (e.g. `query`/`maxRows`
 * for `run_query`, `sourceCode` for `update_source`, single-object
 * `objectName`/`objectType` for `check_syntax`).
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

describe('CLI + MCP parity (misc)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  // ── Syntax check ────────────────────────────────────────────────────────

  it('syntax check (single object, CLAS) — CLI', async () => {
    const res = await runCliCommand(harness, [
      'check',
      'ZCL_EXAMPLE',
      '--type',
      'CLAS',
    ]);
    expect(res.exitCode).toBe(0);
  });

  it('syntax check (single object, CLAS) — MCP', async () => {
    const res = await callMcpTool<{
      hasErrors: boolean;
      hasWarnings: boolean;
    }>(harness, 'check_syntax', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
    });
    expect(res.isError).toBe(false);
    expect(typeof res.json.hasErrors).toBe('boolean');
  });

  it('syntax check (package) — CLI', async () => {
    const res = await runCliCommand(harness, ['check', '--package', '$TMP']);
    expect(res.exitCode).toBe(0);
  });

  it.todo(
    'syntax check (package) — MCP: check_syntax tool has no packageName parameter',
  );

  // ── Data preview OSQL ───────────────────────────────────────────────────

  it('run OSQL query — CLI', async () => {
    // CLI flag is --rows (not --row-count)
    const res = await runCliCommand(harness, [
      'datapreview',
      'osql',
      'SELECT * FROM t000',
      '--rows',
      '10',
    ]);
    expect(res.exitCode).toBe(0);
  });

  it('run OSQL query — MCP', async () => {
    // MCP tool params are `query` and `maxRows` (not sql/rowCount)
    const res = await callMcpTool(harness, 'run_query', {
      query: 'SELECT * FROM t000',
      maxRows: 10,
    });
    expect(res.isError).toBe(false);
  });

  // ── ABAP run ────────────────────────────────────────────────────────────

  it('abap run — CLI', async () => {
    // Write a minimal ABAP snippet to a tmp file; CLI wraps it in an
    // IF_OO_ADT_CLASSRUN template, then drives create → lock → PUT → unlock
    // → activate → classrun POST → delete against the mock.
    const dir = mkdtempSync(join(tmpdir(), 'adt-run-'));
    const file = join(dir, 'snippet.abap');
    writeFileSync(file, `out->write( 'hello from mock' ).\n`, 'utf8');
    const res = await runCliCommand(harness, ['abap', 'run', file]);
    expect(res.exitCode, res.stderr || res.stdout).toBe(0);
  });

  it('abap run — MCP', async () => {
    const res = await callMcpTool<{ className: string; output: string }>(
      harness,
      'run_abap',
      {
        source: `out->write( 'hello from mock' ).`,
        className: 'ZCL_PARITY_RUN',
      },
    );
    expect(res.isError, JSON.stringify(res.json)).toBe(false);
    expect(typeof res.json.className).toBe('string');
  });

  // ── User lookup ─────────────────────────────────────────────────────────

  it('current user — CLI', async () => {
    const res = await runCliCommand(harness, ['user']);
    expect(res.exitCode).toBe(0);
  });

  it('current user — MCP', async () => {
    const res = await callMcpTool<{ mode: string }>(
      harness,
      'lookup_user',
      {},
    );
    expect(res.isError).toBe(false);
    expect(res.json.mode).toBe('current');
  });

  it('get user by name — CLI', async () => {
    const res = await runCliCommand(harness, ['user', 'DEVELOPER']);
    expect(res.exitCode).toBe(0);
  });

  it('get user by name — MCP', async () => {
    const res = await callMcpTool<{ mode: string }>(harness, 'lookup_user', {
      query: 'DEVELOPER',
    });
    expect(res.isError).toBe(false);
    expect(res.json.mode).toBe('exact');
  });

  it('search users — CLI', async () => {
    const res = await runCliCommand(harness, ['user', 'DEV*']);
    expect(res.exitCode).toBe(0);
  });

  it('search users — MCP', async () => {
    const res = await callMcpTool<{ mode: string }>(harness, 'lookup_user', {
      query: 'DEV*',
    });
    expect(res.isError).toBe(false);
    expect(res.json.mode).toBe('search');
  });

  // ── Lock / Unlock sequence (MCP) ────────────────────────────────────────

  it('lock then unlock object — MCP', async () => {
    const lockRes = await callMcpTool<{
      status: string;
      lockHandle: string;
    }>(harness, 'lock_object', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
    });
    expect(lockRes.isError).toBe(false);
    expect(lockRes.json.status).toBe('locked');
    expect(typeof lockRes.json.lockHandle).toBe('string');
    expect(lockRes.json.lockHandle.length).toBeGreaterThan(0);

    const unlockRes = await callMcpTool<{ status: string }>(
      harness,
      'unlock_object',
      {
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
        lockHandle: lockRes.json.lockHandle,
      },
    );
    expect(unlockRes.isError).toBe(false);
    expect(unlockRes.json.status).toBe('unlocked');
  });

  // ── Lock / Unlock sequence (CLI) ────────────────────────────────────────

  it('lock then unlock object — CLI', async () => {
    // Use a unique name so we don't collide with the MCP test's persisted handle
    const lockRes = await runCliCommand(harness, [
      'lock',
      'ZCL_CLI_EXAMPLE',
      '--type',
      'CLAS',
    ]);
    expect(lockRes.exitCode, lockRes.stderr || lockRes.stdout).toBe(0);

    // CLI unlock reads the persisted handle from ~/.adt/locks.json.
    // In the in-process harness the lock store's persistence is best-effort,
    // so fall back to --force which re-locks to recover the handle from the
    // mock backend and immediately unlocks (same-user lock semantics).
    const unlockRes = await runCliCommand(harness, [
      'unlock',
      'ZCL_CLI_EXAMPLE',
      '--type',
      'CLAS',
      '--force',
    ]);
    expect(unlockRes.exitCode, unlockRes.stderr || unlockRes.stdout).toBe(0);
  });

  // ── Source get ──────────────────────────────────────────────────────────

  it('source get — CLI', async () => {
    const res = await runCliCommand(harness, [
      'source',
      'get',
      'ZCL_EXAMPLE',
      '--type',
      'CLAS',
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.length).toBeGreaterThan(0);
  });

  it('source get — MCP', async () => {
    const res = await callMcpTool<{ source: string }>(harness, 'get_source', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
    });
    expect(res.isError).toBe(false);
    expect(typeof res.json.source).toBe('string');
    expect(res.json.source.length).toBeGreaterThan(0);
  });

  // ── Source put ──────────────────────────────────────────────────────────

  it('source put — CLI', async () => {
    // CLI requires a file path (no --content flag), so write a tmp file.
    const dir = mkdtempSync(join(tmpdir(), 'adt-cli-parity-'));
    const file = join(dir, 'zcl_example.abap');
    writeFileSync(
      file,
      'CLASS zcl_example IMPLEMENTATION.\nENDCLASS.\n',
      'utf8',
    );
    const res = await runCliCommand(harness, [
      'source',
      'put',
      'ZCL_PUT_EXAMPLE',
      file,
      '--type',
      'CLAS',
    ]);
    expect(res.exitCode).toBe(0);
  });

  it('source put — MCP', async () => {
    // MCP update_source parameter is `sourceCode` (not `source`)
    const res = await callMcpTool<{ status: string }>(
      harness,
      'update_source',
      {
        objectName: 'ZCL_PUT_EXAMPLE',
        objectType: 'CLAS',
        sourceCode: 'CLASS zcl_example IMPLEMENTATION.\nENDCLASS.\n',
      },
    );
    expect(res.isError).toBe(false);
    expect(res.json.status).toBe('updated');
  });

  // ── System info ─────────────────────────────────────────────────────────

  it('system info — CLI', async () => {
    const res = await runCliCommand(harness, ['info']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.length).toBeGreaterThan(0);
  });

  it('system info — MCP', async () => {
    const res = await callMcpTool(harness, 'system_info', {});
    expect(res.isError).toBe(false);
  });

  // ── Discovery ───────────────────────────────────────────────────────────

  it('discovery — CLI', async () => {
    const res = await runCliCommand(harness, ['discovery']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.length).toBeGreaterThan(0);
  });

  it('discovery — MCP', async () => {
    const res = await callMcpTool(harness, 'discovery', {});
    expect(res.isError).toBe(false);
  });
});
