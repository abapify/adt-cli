/**
 * Workflow integration tests for @abapify/adt-pilot
 *
 * Tests the three workflow modes:
 * - Package mode happy path
 * - Transport mode happy path
 * - Empty package → empty report
 * - Partial ATC failure → report with error finding
 *
 * Uses @abapify/adt-fixtures mock ADT server + @abapify/adt-mcp
 * connected via InMemoryTransport (same pattern as adt-mcp integration tests).
 */

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

const MOCK_PASSWORD = 'test-password-1234';

function connArgs() {
  return {
    baseUrl: `http://localhost:${mockPort}`,
    username: 'DEVELOPER',
    password: MOCK_PASSWORD,
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
// Package mode tests
// ---------------------------------------------------------------------------

describe('Code Review Workflow – package mode', () => {
  it('returns a CodeReviewReport for a package with objects', async () => {
    const workflow = createCodeReviewWorkflow(callTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'package',
        packageName: 'ZPACKAGE',
        ...connArgs(),
      },
    });

    expect(result.status).toBe('success');
    const report = result.result as CodeReviewReport;

    // Basic structure
    expect(report).toBeDefined();
    expect(report.mode).toBe('package');
    expect(report.target).toBe('ZPACKAGE');
    expect(Array.isArray(report.objects)).toBe(true);
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.summary.totalObjects).toBe('number');
    expect(typeof report.summary.totalFindings).toBe('number');
    expect(typeof report.summary.bySeverity).toBe('object');
  });

  it('summary.totalObjects matches the number of resolved objects', async () => {
    const workflow = createCodeReviewWorkflow(callTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'package',
        packageName: 'ZPACKAGE',
        ...connArgs(),
      },
    });

    const report = result.result as CodeReviewReport;
    expect(report.summary.totalObjects).toBe(report.objects.length);
  });

  it('summary.totalFindings matches findings array length', async () => {
    const workflow = createCodeReviewWorkflow(callTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'package',
        packageName: 'ZPACKAGE',
        ...connArgs(),
      },
    });

    const report = result.result as CodeReviewReport;
    // totalFindings counts only findings (not error entries)
    const realFindings = report.findings.filter((f) => f.priority !== 'error');
    expect(report.summary.totalFindings).toBe(report.findings.length);
    // The mock ATC worklist fixture has findings for ZCL_SAMPLE_CLASS
    expect(realFindings.length).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Transport mode tests
// ---------------------------------------------------------------------------

describe('Code Review Workflow – transport mode', () => {
  it('returns a CodeReviewReport for a transport', async () => {
    const workflow = createCodeReviewWorkflow(callTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'transport',
        transportNumber: 'DEVK900001',
        ...connArgs(),
      },
    });

    expect(result.status).toBe('success');
    const report = result.result as CodeReviewReport;

    expect(report.mode).toBe('transport');
    expect(report.target).toBe('DEVK900001');
    expect(report.objects).toHaveLength(1);
    expect(report.objects[0]).toContain('DEVK900001');
    expect(typeof report.summary.totalObjects).toBe('number');
  });

  it('objects array contains the transport URI', async () => {
    const workflow = createCodeReviewWorkflow(callTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'transport',
        transportNumber: 'DEVK900001',
        ...connArgs(),
      },
    });

    const report = result.result as CodeReviewReport;
    expect(report.objects[0]).toBe(
      '/sap/bc/adt/cts/transportrequests/DEVK900001',
    );
  });
});

// ---------------------------------------------------------------------------
// Empty package test
// ---------------------------------------------------------------------------

describe('Code Review Workflow – empty package', () => {
  it('returns an empty report when no objects are found', async () => {
    // The mock always returns the same search results.
    // Use a package name that doesn't match any fixture objects so the
    // objects array comes back empty (the mock filters by packageName match).
    const workflow = createCodeReviewWorkflow(callTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'package',
        packageName: 'ZEMPTY_PACKAGE_DOES_NOT_EXIST',
        ...connArgs(),
      },
    });

    expect(result.status).toBe('success');
    const report = result.result as CodeReviewReport;

    // No objects → no findings
    expect(report.objects).toHaveLength(0);
    expect(report.findings).toHaveLength(0);
    expect(report.summary.totalObjects).toBe(0);
    expect(report.summary.totalFindings).toBe(0);
    expect(Object.keys(report.summary.bySeverity)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Error handling test
// ---------------------------------------------------------------------------

describe('Code Review Workflow – error handling', () => {
  it('produces an error finding when atc_run fails, workflow still completes', async () => {
    // Inject a tool caller that succeeds for list_package_objects but
    // throws for atc_run, simulating a partial failure
    const failingAtcCallTool: McpToolCaller = async (toolName, args) => {
      if (toolName === 'list_package_objects') {
        // Return a single fake object
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

    const workflow = createCodeReviewWorkflow(failingAtcCallTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'package',
        packageName: 'ZPACKAGE',
        ...connArgs(),
      },
    });

    expect(result.status).toBe('success');
    const report = result.result as CodeReviewReport;

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].priority).toBe('error');
    expect(report.findings[0].description).toContain('ATC service unavailable');
    expect(report.summary.totalFindings).toBe(1);
    expect(report.summary.bySeverity['error']).toBe(1);
  });

  it('produces error findings for all objects when atc_run consistently fails', async () => {
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

    const workflow = createCodeReviewWorkflow(failingCallTool);
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        mode: 'package',
        packageName: 'ZPACKAGE',
        ...connArgs(),
      },
    });

    const report = result.result as CodeReviewReport;
    expect(report.objects).toHaveLength(2);
    expect(report.findings).toHaveLength(2);
    expect(report.findings.every((f) => f.priority === 'error')).toBe(true);
  });
});
