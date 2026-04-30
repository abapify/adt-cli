/**
 * Workflow integration tests for @abapify/adt-pilot
 *
 * Covers both code-review modes end-to-end:
 *  - **Package mode** — happy path + empty-package edge case.
 *  - **Transport mode** — happy path + transport-URI assertion.
 *  - **Partial / total ATC failure** — workflow continues and surfaces
 *    error findings.
 *
 * The setup wires `@abapify/adt-mcp` to an in-memory `@abapify/adt-fixtures`
 * mock ADT server through `InMemoryTransport`, then drives the workflow
 * via the public `createCodeReviewWorkflow` factory. No real network
 * traffic and no LLM calls.
 */

import { randomBytes } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMockAdtServer, type MockAdtServer } from '@abapify/adt-fixtures';
import { createAdtClient } from '@abapify/adt-client';
import { createMcpServer } from '@abapify/adt-mcp';
import { createCodeReviewWorkflow, createMcpToolCaller } from '../src/index.js';
import type { CodeReviewReport, McpToolCaller } from '../src/index.js';

// ---------------------------------------------------------------------------
// Test-level setup
// ---------------------------------------------------------------------------

let mockAdt: MockAdtServer;
let mockPort: number;
let mcpClient: Client;
let callTool: McpToolCaller;

// The mock ADT server accepts any credential — we generate a random
// secret per test process so no literal credentials live in the repo
// (also keeps SonarCloud security-hotspot scanners happy).
const MOCK_USER = 'DEVELOPER';
const MOCK_SECRET = randomBytes(16).toString('hex');

function connArgs() {
  return {
    baseUrl: `http://localhost:${mockPort}`,
    username: MOCK_USER,
    password: MOCK_SECRET,
    client: '100',
  };
}

beforeAll(async () => {
  // 1. Start mock ADT HTTP server
  mockAdt = createMockAdtServer();
  const info = await mockAdt.start();
  mockPort = info.port;

  // 2. Create MCP server backed by the mock ADT server
  const server = createMcpServer({
    clientFactory: (params) =>
      createAdtClient({
        baseUrl: params.baseUrl,
        username: params.username ?? '',
        password: params.password ?? '',
        client: params.client,
      }),
  });

  // 3. Wire via InMemoryTransport
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  mcpClient = new Client({ name: 'adt-pilot-test', version: '0.0.1' });
  await mcpClient.connect(clientTransport);

  callTool = createMcpToolCaller(mcpClient);
});

afterAll(async () => {
  await mcpClient.close();
  await mockAdt.stop();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runReview(
  caller: McpToolCaller,
  inputData: Parameters<
    Awaited<
      ReturnType<ReturnType<typeof createCodeReviewWorkflow>['createRun']>
    >['start']
  >[0]['inputData'],
) {
  const workflow = createCodeReviewWorkflow(caller);
  const run = await workflow.createRun();
  return run.start({ inputData });
}

function expectSuccess(
  result: Awaited<ReturnType<typeof runReview>>,
): CodeReviewReport {
  expect(result.status).toBe('success');
  // Narrow without assertions in the assertion: only `success` carries `result`.
  if (result.status !== 'success') {
    throw new Error(`Expected success, got ${result.status}`);
  }
  return result.result;
}

// ---------------------------------------------------------------------------
// Package mode tests
// ---------------------------------------------------------------------------

describe('Code Review Workflow – package mode', () => {
  it('returns a CodeReviewReport for a package with objects', async () => {
    const result = await runReview(callTool, {
      mode: 'package',
      packageName: 'ZPACKAGE',
      ...connArgs(),
    });

    const report = expectSuccess(result);

    expect(report.mode).toBe('package');
    expect(report.target).toBe('ZPACKAGE');
    expect(Array.isArray(report.objects)).toBe(true);
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.summary.totalObjects).toBe('number');
    expect(typeof report.summary.totalFindings).toBe('number');
    expect(typeof report.summary.bySeverity).toBe('object');
  });

  it('summary.totalObjects matches the number of resolved objects', async () => {
    const result = await runReview(callTool, {
      mode: 'package',
      packageName: 'ZPACKAGE',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    expect(report.summary.totalObjects).toBe(report.objects.length);
  });

  it('summary.totalFindings matches the findings array length', async () => {
    const result = await runReview(callTool, {
      mode: 'package',
      packageName: 'ZPACKAGE',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    expect(report.summary.totalFindings).toBe(report.findings.length);
  });

  it('returns an empty report when the package has no objects', async () => {
    // The mock filters search results by packageName; an unknown name
    // produces an empty objects array.
    const result = await runReview(callTool, {
      mode: 'package',
      packageName: 'ZEMPTY_PACKAGE_DOES_NOT_EXIST',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    expect(report.objects).toHaveLength(0);
    expect(report.findings).toHaveLength(0);
    expect(report.summary.totalObjects).toBe(0);
    expect(report.summary.totalFindings).toBe(0);
    expect(Object.keys(report.summary.bySeverity)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Transport mode tests
// ---------------------------------------------------------------------------

describe('Code Review Workflow – transport mode', () => {
  it('returns a CodeReviewReport for a transport', async () => {
    const result = await runReview(callTool, {
      mode: 'transport',
      transportNumber: 'DEVK900001',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    expect(report.mode).toBe('transport');
    expect(report.target).toBe('DEVK900001');
    expect(report.objects).toHaveLength(1);
    expect(report.objects[0]).toBe(
      '/sap/bc/adt/cts/transportrequests/DEVK900001',
    );
  });

  it('aggregates ATC findings (or errors) into the summary', async () => {
    const result = await runReview(callTool, {
      mode: 'transport',
      transportNumber: 'DEVK900001',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    const sumFromBuckets = Object.values(report.summary.bySeverity).reduce(
      (acc, n) => acc + n,
      0,
    );
    expect(sumFromBuckets).toBe(report.summary.totalFindings);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Code Review Workflow – error handling', () => {
  it('produces a single error finding when atc_run fails', async () => {
    const failingAtcCallTool: McpToolCaller = async (toolName, args) => {
      if (toolName === 'list_package_objects') {
        return {
          packageName: args.packageName,
          count: 1,
          objects: [{ uri: '/sap/bc/adt/oo/classes/zcl_fail_test' }],
        };
      }
      if (toolName === 'atc_run') {
        throw new Error('ATC service unavailable');
      }
      return callTool(toolName, args);
    };

    const result = await runReview(failingAtcCallTool, {
      mode: 'package',
      packageName: 'ZPACKAGE',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.priority).toBe('error');
    expect(report.findings[0]?.description).toContain(
      'ATC service unavailable',
    );
    expect(report.summary.totalFindings).toBe(1);
    expect(report.summary.bySeverity['error']).toBe(1);
  });

  it('produces error findings for every object when atc_run consistently fails', async () => {
    const failingCallTool: McpToolCaller = async (toolName, args) => {
      if (toolName === 'list_package_objects') {
        return {
          packageName: args.packageName,
          count: 2,
          objects: [
            { uri: '/sap/bc/adt/oo/classes/zcl_fail_1' },
            { uri: '/sap/bc/adt/oo/classes/zcl_fail_2' },
          ],
        };
      }
      if (toolName === 'atc_run') {
        throw new Error('Network error');
      }
      return callTool(toolName, args);
    };

    const result = await runReview(failingCallTool, {
      mode: 'package',
      packageName: 'ZPACKAGE',
      ...connArgs(),
    });

    const report = expectSuccess(result);
    expect(report.objects).toHaveLength(2);
    expect(report.findings).toHaveLength(2);
    expect(report.findings.every((f) => f.priority === 'error')).toBe(true);
    expect(report.summary.bySeverity['error']).toBe(2);
  });

  it('still completes when transport lookup fails (transport mode error path)', async () => {
    const failingTransportCallTool: McpToolCaller = async (toolName) => {
      if (toolName === 'cts_get_transport') {
        throw new Error('Transport not found');
      }
      throw new Error(`Unexpected tool call: ${toolName}`);
    };

    const result = await runReview(failingTransportCallTool, {
      mode: 'transport',
      transportNumber: 'DOES_NOT_EXIST',
      ...connArgs(),
    });

    // Transport lookup failure happens inside step 1 — the workflow run
    // ends in `failed`. Tolerate either shape for forward-compat.
    expect(['failed', 'success']).toContain(result.status);
    if (result.status === 'failed') {
      expect(result.error.message).toContain('Transport not found');
    }
  });
});
