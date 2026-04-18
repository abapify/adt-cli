/**
 * CLI + MCP parity tests for RAP Service Bindings (SRVB/SVB).
 *
 * Targets the `/sap/bc/adt/businessservices/bindings` endpoint. Each
 * `it` exercises a single logical operation through both the CLI and
 * the equivalent MCP tool so the two surfaces stay aligned.
 *
 * Covers: read, create, publish, unpublish, delete.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
} from './index';

describe('CLI + MCP parity (srvb)', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('parity: read SRVB metadata', async () => {
    const cli = await runCliCommand(harness, [
      'srvb',
      'read',
      'ZUI_MOCK_SRVB',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'get_srvb', {
      srvbName: 'ZUI_MOCK_SRVB',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: create SRVB', async () => {
    const cli = await runCliCommand(harness, [
      'srvb',
      'create',
      'ZUI_NEW',
      'Mock RAP service binding',
      '$TMP',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'create_srvb', {
      srvbName: 'ZUI_NEW',
      description: 'Mock RAP service binding',
      packageName: '$TMP',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Also assert the generic dispatch works for SRVB
    const generic = await callMcpTool(harness, 'create_object', {
      objectType: 'SRVB',
      objectName: 'ZUI_NEW2',
      description: 'Mock',
      packageName: '$TMP',
    });
    expect(generic.isError, JSON.stringify(generic.json)).toBe(false);
  });

  it('parity: publish SRVB', async () => {
    const cli = await runCliCommand(harness, [
      'srvb',
      'publish',
      'ZUI_MOCK_SRVB',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    // Legacy MCP tool (backward compatible) — now delegates to contract
    const legacy = await callMcpTool(harness, 'publish_service_binding', {
      bindingName: 'ZUI_MOCK_SRVB',
    });
    expect(legacy.isError, JSON.stringify(legacy.json)).toBe(false);
  });

  it('parity: unpublish SRVB', async () => {
    const cli = await runCliCommand(harness, [
      'srvb',
      'unpublish',
      'ZUI_MOCK_SRVB',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'unpublish_srvb', {
      srvbName: 'ZUI_MOCK_SRVB',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Legacy tool with unpublish:true flag still works
    const legacy = await callMcpTool(harness, 'publish_service_binding', {
      bindingName: 'ZUI_MOCK_SRVB',
      unpublish: true,
    });
    expect(legacy.isError, JSON.stringify(legacy.json)).toBe(false);
  });

  it('parity: activate SRVB', async () => {
    const cli = await runCliCommand(harness, [
      'srvb',
      'activate',
      'ZUI_MOCK_SRVB',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'activate_object', {
      objectName: 'ZUI_MOCK_SRVB',
      objectType: 'SRVB',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);
  });

  it('parity: delete SRVB', async () => {
    const cli = await runCliCommand(harness, ['srvb', 'delete', 'ZUI_NEW', '-y']);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool(harness, 'delete_srvb', {
      srvbName: 'ZUI_NEW',
    });
    expect(mcp.isError, JSON.stringify(mcp.json)).toBe(false);

    // Generic dispatch
    const generic = await callMcpTool(harness, 'delete_object', {
      objectType: 'SRVB',
      objectName: 'ZUI_NEW2',
    });
    expect(generic.isError, JSON.stringify(generic.json)).toBe(false);
  });
});
