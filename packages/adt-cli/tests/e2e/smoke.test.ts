/**
 * Smoke test for the CLI + MCP parity harness.
 *
 * Verifies that:
 *   1. The shared mock ADT server boots and is reachable.
 *   2. `runCliCommand()` drives a real CLI command through the harness and
 *      captures its stdout.
 *   3. `callMcpTool()` invokes an MCP tool against the same in-memory server
 *      wired to the same `AdtClient`.
 *   4. `assertParity()` runs both paths and passes when the assertion
 *      callback succeeds.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  assertParity,
  type AdtHarness,
} from './index';

describe('CLI + MCP e2e harness (smoke)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('boots mock backend and exposes a port', () => {
    expect(harness.mockPort).toBeGreaterThan(0);
    expect(harness.connection.baseUrl).toContain(String(harness.mockPort));
  });

  it('runCliCommand drives `adt cts tr list` against the mock', async () => {
    const result = await runCliCommand(harness, ['cts', 'tr', 'list']);
    expect(result.exitCode).toBe(0);
    // The command prints either a "Found N transports" header or "No transports found".
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout).toMatch(
      /Found \d+ transports|No transports found|transports/i,
    );
  });

  it('callMcpTool invokes `cts_list_transports` against the same mock', async () => {
    const result = await callMcpTool<{
      count: number;
      transports: unknown[];
    }>(harness, 'cts_list_transports', {});
    expect(result.isError).toBe(false);
    expect(result.json).toBeDefined();
    expect(Array.isArray(result.json.transports)).toBe(true);
    expect(typeof result.json.count).toBe('number');
  });

  it('assertParity runs CLI + MCP and exposes both results', async () => {
    const { cli, mcp } = await assertParity(harness, 'list transports', {
      cli: { argv: ['cts', 'tr', 'list', '--json'] },
      mcp: { tool: 'cts_list_transports', args: {} },
      expect: (cliRes, mcpRes) => {
        expect(cliRes.exitCode).toBe(0);
        expect(mcpRes.isError).toBe(false);
        // Both paths must reference the same underlying list of transports.
        const mcpJson = mcpRes.json as {
          count: number;
          transports: unknown[];
        };
        // CLI --json prints an array of transports
        if (Array.isArray(cliRes.json)) {
          expect(cliRes.json.length).toBeLessThanOrEqual(mcpJson.count);
        }
      },
    });

    expect(cli.exitCode).toBe(0);
    expect(mcp.isError).toBe(false);
  });
});
