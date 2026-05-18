import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
} from './index';

describe('CLI + MCP parity (arc-1 features)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('lint command is reachable — CLI', async () => {
    const res = await runCliCommand(harness, ['lint', '--help']);
    expect(res.exitCode).toBe(0);
  });

  it('lint_abap tool lists rules — MCP', async () => {
    const res = await callMcpTool<{ rules: Array<{ key: string }> }>(
      harness,
      'lint_abap',
      {
        action: 'list_rules',
      },
    );

    expect(res.isError, JSON.stringify(res.json)).toBe(false);
    expect(Array.isArray(res.json.rules)).toBe(true);
    expect(res.json.rules.length).toBeGreaterThan(0);
  });

  it('context command is reachable — CLI', async () => {
    const res = await runCliCommand(harness, ['context', '--help']);
    expect(res.exitCode).toBe(0);
  });

  it('get_context tool resolves dependencies — MCP', async () => {
    const res = await callMcpTool<{ dependencies: unknown[] }>(
      harness,
      'get_context',
      {
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
        depth: 1,
        maxDeps: 5,
      },
    );

    expect(res.isError, JSON.stringify(res.json)).toBe(false);
    expect(Array.isArray(res.json.dependencies)).toBe(true);
  });

  it('diagnose dumps command is reachable — CLI', async () => {
    const res = await runCliCommand(harness, ['diagnose', 'dumps', '--help']);
    expect(res.exitCode).toBe(0);
  });

  it('get_short_dumps tool returns data or backend error — MCP', async () => {
    const res = await callMcpTool(harness, 'get_short_dumps', {
      maxResults: 5,
    });

    expect(typeof res.isError).toBe('boolean');
  });

  it('diagnose traces command is reachable — CLI', async () => {
    const res = await runCliCommand(harness, ['diagnose', 'traces', '--help']);
    expect(res.exitCode).toBe(0);
  });

  it('get_traces tool returns data or backend error — MCP', async () => {
    const res = await callMcpTool(harness, 'get_traces', {
      action: 'list',
    });

    expect(typeof res.isError).toBe('boolean');
  });

  it('get_completions tool returns data or backend error — MCP', async () => {
    const res = await callMcpTool(harness, 'get_completions', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
      line: 1,
      column: 1,
    });

    expect(typeof res.isError).toBe('boolean');
  });
});
