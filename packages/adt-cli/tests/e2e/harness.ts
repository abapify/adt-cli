/**
 * CLI + MCP end-to-end parity harness.
 *
 * Boots the shared mock ADT server (`@abapify/adt-fixtures`), an in-process
 * MCP server (`@abapify/adt-mcp`), and a real `AdtClient` pointed at the mock.
 * The same `AdtClient` instance is injected into the CLI via
 * `__setTestAdtClient`, and into MCP tool handlers via the `clientFactory`
 * option – so CLI commands and MCP tools hit the exact same mock backend.
 *
 * Usage:
 *   const harness = await startAdtHarness();
 *   try {
 *     const cli = await runCliCommand(harness, ['cts', 'tr', 'list']);
 *     const mcp = await callMcpTool(harness, 'cts_list_transports', {});
 *     await assertParity('list transports', {
 *       cli: { argv: ['cts', 'tr', 'list'] },
 *       mcp: { tool: 'cts_list_transports', args: {} },
 *       expect: (cliResult, mcpResult) => { ... },
 *     });
 *   } finally {
 *     await harness.stop();
 *   }
 */

import type { Command } from 'commander';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createMockAdtServer,
  type MockAdtServer,
} from '@abapify/adt-fixtures';
/* eslint-disable-next-line @nx/enforce-module-boundaries */
import { createMcpServer } from '@abapify/adt-mcp';
import {
  createAdtClient,
  type AdtClient,
} from '@abapify/adt-client';
import { initializeAdk } from '@abapify/adk';

import { createCLI } from '../../src/lib/cli';
import {
  __setTestAdtClient,
  silentLogger,
} from '../../src/lib/utils/adt-client-v2';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface HarnessConnectionArgs {
  baseUrl: string;
  username: string;
  password: string;
  client: string;
}

export interface AdtHarness {
  /** Shared AdtClient – used by both CLI and MCP tool handlers. */
  readonly client: AdtClient;
  /** Mock HTTP server (for lock-registry assertions etc.). */
  readonly mock: MockAdtServer;
  /** Port of the mock ADT server. */
  readonly mockPort: number;
  /** MCP client connected to the in-process MCP server. */
  readonly mcpClient: McpClient;
  /** Connection arguments matching the mock server. */
  readonly connection: HarnessConnectionArgs;
  /** Shared Commander program (constructed once – commander uses singletons). */
  readonly program: Command;
  /** Shut everything down (mock server, MCP client, DI override). */
  stop(): Promise<void>;
}

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** Parsed JSON from stdout, if stdout is valid JSON. */
  json?: unknown;
  /** Any error thrown by parseAsync (non-exit). */
  error?: Error;
}

export interface McpCallResult<T = unknown> {
  /** Parsed first text content as JSON (falls back to raw text). */
  json: T;
  /** Raw tool-call result from the MCP client. */
  raw: unknown;
  /** Whether the tool returned `isError: true`. */
  isError: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// startAdtHarness
// ────────────────────────────────────────────────────────────────────────────

/**
 * Custom error thrown in place of `process.exit()` so a CLI run can be
 * caught by the harness without actually exiting the test process.
 */
class ProcessExitError extends Error {
  constructor(public readonly exitCode: number) {
    super(`process.exit(${exitCode})`);
    this.name = 'ProcessExitError';
  }
}

export async function startAdtHarness(): Promise<AdtHarness> {
  // 1. Start mock ADT HTTP server
  const mock = createMockAdtServer();
  const { port: mockPort } = await mock.start();

  const connection: HarnessConnectionArgs = {
    baseUrl: `http://127.0.0.1:${mockPort}`,
    username: 'DEVELOPER',
    password: 'mock-password',
    client: '100',
  };

  // 2. Build the shared AdtClient pointed at the mock
  const client = createAdtClient({
    baseUrl: connection.baseUrl,
    username: connection.username,
    password: connection.password,
    client: connection.client,
    logger: silentLogger,
  });

  // 3. Inject the client into the CLI
  __setTestAdtClient(client);

  // 3b. Initialise ADK with the same client — CLI commands and MCP tools that
  // go through `@abapify/adk` (transports, DDIC/CDS, objects) require a
  // global ADK context. Production does this via the auth path; in tests we
  // do it explicitly.
  initializeAdk(client);

  // 4. Build the Commander program exactly once (commander uses singletons)
  const program = await createCLI();

  // 5. Create MCP server with a clientFactory that returns the SAME client
  const mcpServer = createMcpServer({
    clientFactory: () => client,
  });

  // 6. Wire an in-memory transport between an MCP client and the server
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await mcpServer.connect(serverTransport);

  const mcpClient = new McpClient({
    name: 'adt-cli-e2e-harness',
    version: '0.0.1',
  });
  await mcpClient.connect(clientTransport);

  return {
    client,
    mock,
    mockPort,
    mcpClient,
    connection,
    program,
    async stop() {
      try {
        await mcpClient.close();
      } catch {
        /* ignore */
      }
      try {
        await mock.stop();
      } catch {
        /* ignore */
      }
      __setTestAdtClient(null);
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// runCliCommand
// ────────────────────────────────────────────────────────────────────────────

function tryParseJson(text: string): unknown | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  // Fast-path: only attempt if it starts with JSON-ish
  const first = trimmed[0];
  if (first !== '{' && first !== '[' && first !== '"') return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

/**
 * Run a CLI command programmatically against the harness's mock backend.
 *
 * - Captures stdout/stderr produced by `console.*` and `process.stdout/stderr.write`.
 * - Intercepts `process.exit()` so it doesn't terminate the test process.
 * - Uses commander's `exitOverride()` to convert parse errors into thrown errors.
 * - Returns a `CliRunResult` with stdout, stderr, exitCode, and optional parsed JSON.
 */
export async function runCliCommand(
  harness: AdtHarness,
  argv: string[],
): Promise<CliRunResult> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  // Save originals
  const origLog = console.log;
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;
  const origDebug = console.debug;
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  const origExit = process.exit;

  const captureStdout = (...args: unknown[]) => {
    stdoutChunks.push(args.map((a) => formatArg(a)).join(' ') + '\n');
  };
  const captureStderr = (...args: unknown[]) => {
    stderrChunks.push(args.map((a) => formatArg(a)).join(' ') + '\n');
  };

  console.log = captureStdout as typeof console.log;
  console.info = captureStdout as typeof console.info;
  console.warn = captureStderr as typeof console.warn;
  console.error = captureStderr as typeof console.error;
  console.debug = captureStdout as typeof console.debug;

  (process.stdout as { write: (...args: unknown[]) => boolean }).write = ((
    chunk: unknown,
  ) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : String(chunk));
    return true;
  }) as unknown as typeof process.stdout.write;
  (process.stderr as { write: (...args: unknown[]) => boolean }).write = ((
    chunk: unknown,
  ) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : String(chunk));
    return true;
  }) as unknown as typeof process.stderr.write;

  (process.exit as unknown) = ((code?: number) => {
    throw new ProcessExitError(code ?? 0);
  }) as typeof process.exit;

  // Commander: prevent it from calling process.exit on parse errors
  harness.program.exitOverride();

  let exitCode = 0;
  let caughtError: Error | undefined;

  try {
    await harness.program.parseAsync(['node', 'adt', ...argv]);
  } catch (err) {
    if (err instanceof ProcessExitError) {
      exitCode = err.exitCode;
    } else if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      typeof (err as { code?: unknown }).code === 'string' &&
      ((err as { code: string }).code.startsWith('commander.') ||
        (err as { code: string }).code === 'commander.helpDisplayed')
    ) {
      // Commander threw due to exitOverride (help, version, parse error).
      const anyErr = err as { exitCode?: number; message?: string };
      exitCode = anyErr.exitCode ?? 0;
    } else {
      caughtError = err as Error;
      exitCode = 1;
    }
  } finally {
    console.log = origLog;
    console.info = origInfo;
    console.warn = origWarn;
    console.error = origError;
    console.debug = origDebug;
    (process.stdout as { write: typeof origStdoutWrite }).write =
      origStdoutWrite;
    (process.stderr as { write: typeof origStderrWrite }).write =
      origStderrWrite;
    process.exit = origExit;
  }

  const stdout = stdoutChunks.join('');
  const stderr = stderrChunks.join('');

  return {
    stdout,
    stderr,
    exitCode,
    json: tryParseJson(stdout),
    error: caughtError,
  };
}

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// callMcpTool
// ────────────────────────────────────────────────────────────────────────────

/**
 * Call an MCP tool on the harness's in-memory server. Connection arguments
 * (baseUrl / username / password / client) are merged automatically.
 */
export async function callMcpTool<T = unknown>(
  harness: AdtHarness,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<McpCallResult<T>> {
  const result = await harness.mcpClient.callTool({
    name: toolName,
    arguments: { ...harness.connection, ...args },
  });

  const content = (result.content as Array<{ type: string; text?: string }>) ??
    [];
  const firstText = content[0]?.text ?? '';

  let parsed: unknown = firstText;
  try {
    parsed = JSON.parse(firstText);
  } catch {
    /* leave parsed as raw text */
  }

  return {
    json: parsed as T,
    raw: result,
    isError: Boolean((result as { isError?: boolean }).isError),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// assertParity
// ────────────────────────────────────────────────────────────────────────────

export interface ParityOptions {
  cli: { argv: string[] };
  mcp: { tool: string; args?: Record<string, unknown> };
  /**
   * Called with the CLI and MCP results. Throw (via `expect` / `assert`) to
   * fail the parity check. Optional – if omitted, only basic sanity checks
   * are performed (CLI exit 0, MCP not isError).
   */
  expect?: (cli: CliRunResult, mcp: McpCallResult) => void | Promise<void>;
}

/**
 * Run the same logical operation through both the CLI and the MCP server,
 * then invoke `expect` with both results. Ensures the harness is shared, so
 * both paths hit the same mock backend / lock registry / fixtures.
 */
export async function assertParity(
  harness: AdtHarness,
  description: string,
  opts: ParityOptions,
): Promise<{ cli: CliRunResult; mcp: McpCallResult }> {
  const cli = await runCliCommand(harness, opts.cli.argv);
  const mcp = await callMcpTool(harness, opts.mcp.tool, opts.mcp.args ?? {});

  if (cli.exitCode !== 0) {
    throw new Error(
      `[parity:${description}] CLI exited with code ${cli.exitCode}.\n` +
        `  stdout: ${cli.stdout}\n` +
        `  stderr: ${cli.stderr}` +
        (cli.error ? `\n  error: ${cli.error.message}` : ''),
    );
  }

  if (mcp.isError) {
    throw new Error(
      `[parity:${description}] MCP tool returned isError=true:\n  ${JSON.stringify(
        mcp.json,
      )}`,
    );
  }

  if (opts.expect) {
    await opts.expect(cli, mcp);
  }

  return { cli, mcp };
}
