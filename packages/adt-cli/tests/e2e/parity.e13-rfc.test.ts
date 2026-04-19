/**
 * CLI + MCP parity for E13 — `adt rfc` / `call_rfc`.
 *
 * The mock server's `/sap/bc/soap/rfc` route always returns a canned
 * STFC_CONNECTION.Response with `ECHOTEXT=hello` and a mock `RESPTEXT`.
 * Both CLI and MCP paths should produce the same decoded response.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
} from './index';

describe('CLI + MCP parity (E13 rfc)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('CLI: `adt rfc STFC_CONNECTION --param REQUTEXT=hello` echoes hello', async () => {
    const res = await runCliCommand(harness, [
      'rfc',
      'STFC_CONNECTION',
      '--param',
      'REQUTEXT=hello',
    ]);
    if (res.exitCode !== 0) {
      // Help debug failures in CI
      throw new Error(
        `CLI failed (exit ${res.exitCode})\nstdout: ${res.stdout}\nstderr: ${res.stderr}`,
      );
    }
    expect(res.exitCode).toBe(0);
    // Response printed as JSON — look for both fields.
    expect(res.stdout).toContain('"ECHOTEXT": "hello"');
    expect(res.stdout).toContain('RESPTEXT');
  });

  it('MCP: `call_rfc` returns the same parsed response', async () => {
    const res = await callMcpTool<{ ECHOTEXT: string; RESPTEXT: string }>(
      harness,
      'call_rfc',
      {
        functionModule: 'STFC_CONNECTION',
        parameters: { REQUTEXT: 'hello' },
      },
    );
    expect(res.isError).toBe(false);
    expect(res.json.ECHOTEXT).toBe('hello');
    expect(typeof res.json.RESPTEXT).toBe('string');
    expect(res.json.RESPTEXT.length).toBeGreaterThan(0);
  });

  it('CLI + MCP agree on the ECHOTEXT field', async () => {
    const cli = await runCliCommand(harness, [
      'rfc',
      'STFC_CONNECTION',
      '--param',
      'REQUTEXT=hello',
    ]);
    const mcp = await callMcpTool<{ ECHOTEXT: string }>(
      harness,
      'call_rfc',
      {
        functionModule: 'STFC_CONNECTION',
        parameters: { REQUTEXT: 'hello' },
      },
    );
    expect(cli.exitCode).toBe(0);
    expect(mcp.isError).toBe(false);
    expect(cli.stdout).toContain(`"ECHOTEXT": "${mcp.json.ECHOTEXT}"`);
  });

  it('CLI: rejects malformed --param (missing =)', async () => {
    const res = await runCliCommand(harness, [
      'rfc',
      'STFC_CONNECTION',
      '--param',
      'nope',
    ]);
    // Must fail with non-zero exit
    expect(res.exitCode).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/Expected KEY=VALUE|Invalid/);
  });
});
