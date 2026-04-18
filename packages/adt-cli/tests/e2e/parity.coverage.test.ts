/**
 * CLI + MCP parity test for AUnit coverage reports.
 *
 * The aunit command lives in `@abapify/adt-aunit` and is loaded as a
 * CLI plugin at runtime. The e2e harness's `createCLI()` doesn't wire
 * plugins, so here we invoke the plugin's `execute()` directly against
 * the harness mock backend — this exercises the same code path the
 * real CLI uses (just without the commander layer).
 *
 * We then call the corresponding `run_unit_tests` MCP tool with
 * `coverage: true` and assert structural parity: both sides emit a
 * JaCoCo report with the right DOCTYPE, `<report>` root, and an
 * abapGit-style `<sourcefile name="…clas.abap"/>` path.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { aunitCommand } from '@abapify/adt-aunit/commands/aunit';
import type { CliContext } from '@abapify/adt-plugin';
import { startAdtHarness, callMcpTool, type AdtHarness } from './index';

function silentLogger(lines: string[]) {
  return {
    debug: (_msg?: string) => {
      /* silent */
    },
    info: (msg: string) => lines.push(`[info] ${msg}`),
    warn: (msg: string) => lines.push(`[warn] ${msg}`),
    error: (msg: string) => lines.push(`[error] ${msg}`),
  };
}

describe('CLI + MCP parity (aunit coverage)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('CLI aunit --coverage --coverage-format jacoco emits JaCoCo XML', async () => {
    const lines: string[] = [];
    const ctx: CliContext = {
      cwd: process.cwd(),
      config: {},
      logger: silentLogger(lines),
      getAdtClient: async () => harness.client,
      adtSystemName: 'MOCK',
    };

    // Capture stdout from the plugin (which prints the coverage XML).
    const stdoutChunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    const origLog = console.log;
    (process.stdout as { write: (c: unknown) => boolean }).write = ((
      chunk: unknown,
    ) => {
      stdoutChunks.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    }) as unknown as typeof process.stdout.write;
    console.log = ((...args: unknown[]) => {
      stdoutChunks.push(args.map(String).join(' ') + '\n');
    }) as typeof console.log;

    try {
      await aunitCommand.execute!(
        {
          class: 'ZCL_EXAMPLE',
          format: 'console',
          coverage: true,
          coverageFormat: 'jacoco',
        },
        ctx,
      );
    } finally {
      (process.stdout as { write: typeof origWrite }).write = origWrite;
      console.log = origLog;
    }

    const stdout = stdoutChunks.join('');

    expect(stdout).toContain(
      '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">',
    );
    expect(stdout).toContain('<report name="ABAP Coverage">');
    // The mock measurements tree uses CL_EXAMPLE_CLASS / TEST_EXAMPLE_PACKAGE.
    expect(stdout).toContain('<package name="TEST_EXAMPLE_PACKAGE">');
    expect(stdout).toMatch(/sourcefilename="cl_example_class\.clas\.abap"/);
  });

  it('MCP run_unit_tests with coverage returns a JaCoCo report', async () => {
    const res = await callMcpTool<{
      testResults: { totalTests: number };
      coverage: { format: string; xml: string; warning?: string };
    }>(harness, 'run_unit_tests', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
      coverage: true,
      coverageFormat: 'jacoco',
    });
    expect(res.isError).toBe(false);
    expect(res.json.coverage.format).toBe('jacoco');
    expect(
      res.json.coverage.xml,
      `coverage payload: ${JSON.stringify(res.json.coverage).slice(0, 500)}`,
    ).toContain(
      '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">',
    );
    expect(res.json.coverage.xml).toMatch(
      /sourcefilename="cl_example_class\.clas\.abap"/,
    );
  });

  it('CLI and MCP JaCoCo reports have structural parity', async () => {
    // CLI
    const lines: string[] = [];
    const ctx: CliContext = {
      cwd: process.cwd(),
      config: {},
      logger: silentLogger(lines),
      getAdtClient: async () => harness.client,
      adtSystemName: 'MOCK',
    };
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    const origLog = console.log;
    (process.stdout as { write: (c: unknown) => boolean }).write = ((
      chunk: unknown,
    ) => {
      chunks.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    }) as unknown as typeof process.stdout.write;
    console.log = ((...args: unknown[]) => {
      chunks.push(args.map(String).join(' ') + '\n');
    }) as typeof console.log;

    try {
      await aunitCommand.execute!(
        {
          class: 'ZCL_EXAMPLE',
          format: 'console',
          coverage: true,
          coverageFormat: 'jacoco',
        },
        ctx,
      );
    } finally {
      (process.stdout as { write: typeof origWrite }).write = origWrite;
      console.log = origLog;
    }

    const cliXml = chunks.join('');

    // MCP
    const mcp = await callMcpTool<{
      coverage: { xml: string };
    }>(harness, 'run_unit_tests', {
      objectName: 'ZCL_EXAMPLE',
      objectType: 'CLAS',
      coverage: true,
      coverageFormat: 'jacoco',
    });
    const mcpXml = mcp.json.coverage.xml;

    const cliPackages = (cliXml.match(/<package\s/g) ?? []).length;
    const mcpPackages = (mcpXml.match(/<package\s/g) ?? []).length;
    const cliClasses = (cliXml.match(/<class\s/g) ?? []).length;
    const mcpClasses = (mcpXml.match(/<class\s/g) ?? []).length;
    const cliCounters = (cliXml.match(/<counter\s/g) ?? []).length;
    const mcpCounters = (mcpXml.match(/<counter\s/g) ?? []).length;

    expect(cliPackages).toBeGreaterThan(0);
    expect(cliPackages).toBe(mcpPackages);
    expect(cliClasses).toBe(mcpClasses);
    expect(cliCounters).toBe(mcpCounters);
  });
});
