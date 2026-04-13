/**
 * Integration tests for the adt-mcp package.
 *
 * Uses node:test (native Node.js test runner) and the MCP SDK's
 * InMemoryTransport so we can exercise every tool without stdio.
 *
 * A lightweight mock ADT HTTP server provides fixture responses.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/lib/server';
import {
  createMockAdtServer,
  type MockAdtServer,
} from '../src/lib/mock/server';
import { createAdtClient, type AdtClient } from '@abapify/adt-client';
import type { ConnectionParams } from '../src/lib/types';

let mockAdt: MockAdtServer;
let mockPort: number;
let client: Client;

/**
 * Helper – call a tool and return the first text content block parsed as JSON.
 */
async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ json: unknown; raw: unknown }> {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as Array<{ type: string; text: string }>)[0]
    ?.text;
  try {
    return { json: JSON.parse(text), raw: result };
  } catch {
    return { json: text, raw: result };
  }
}

// Generate a random credential per test run – avoids hardcoded credential lint
const mockCredential = randomBytes(16).toString('hex');

/**
 * Build connection args pointing at the mock server.
 */
function connArgs(): Record<string, string> {
  return {
    baseUrl: `http://localhost:${mockPort}`,
    username: 'DEVELOPER',
    password: mockCredential,
    client: '100',
  };
}

describe('adt-mcp integration tests', () => {
  before(async () => {
    // 1. Start mock ADT backend
    mockAdt = createMockAdtServer();
    const info = await mockAdt.start();
    mockPort = info.port;

    // 2. Create MCP server with a client factory that points at mock
    const server = createMcpServer({
      clientFactory: (params: ConnectionParams): AdtClient =>
        createAdtClient({
          baseUrl: params.baseUrl,
          username: params.username ?? '',
          password: params.password ?? '',
          client: params.client,
        }),
    });

    // 3. Wire up in-memory transport
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '0.0.1' });
    await client.connect(clientTransport);
  });

  after(async () => {
    await client.close();
    await mockAdt.stop();
  });

  // ── discovery ──────────────────────────────────────────────────

  describe('discovery tool', () => {
    it('returns workspaces from mock', async () => {
      const { json } = await callTool('discovery', connArgs());
      const data = json as Record<string, unknown>;
      assert.ok(data.workspaces, 'should contain workspaces');
      assert.ok(
        Array.isArray(data.workspaces),
        'workspaces should be an array',
      );
    });

    it('filters workspaces by title', async () => {
      const { json } = await callTool('discovery', {
        ...connArgs(),
        filter: 'CTS',
      });
      const data = json as Array<Record<string, unknown>>;
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].title, 'CTS Services');
    });
  });

  // ── system_info ────────────────────────────────────────────────

  describe('system_info tool', () => {
    it('returns both session and system info by default', async () => {
      const { json } = await callTool('system_info', connArgs());
      const data = json as Record<string, unknown>;
      assert.ok(data.session, 'should have session');
      assert.ok(data.system, 'should have system');
    });

    it('returns only system info when scope=system', async () => {
      const { json } = await callTool('system_info', {
        ...connArgs(),
        scope: 'system',
      });
      const data = json as Record<string, unknown>;
      assert.ok(data.system);
      assert.strictEqual(data.session, undefined);
    });
  });

  // ── search_objects ─────────────────────────────────────────────

  describe('search_objects tool', () => {
    it('returns matching objects', async () => {
      const { json } = await callTool('search_objects', {
        ...connArgs(),
        query: 'ZCL*',
      });
      const data = json as { count: number; objects: unknown[] };
      assert.ok(data.count >= 1, 'should find at least 1 object');
      assert.ok(Array.isArray(data.objects));
    });
  });

  // ── get_object ─────────────────────────────────────────────────

  describe('get_object tool', () => {
    it('finds an exact-match object', async () => {
      const { json } = await callTool('get_object', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
      });
      const data = json as { found: boolean; object?: { name: string } };
      assert.strictEqual(data.found, true);
      assert.strictEqual(data.object?.name, 'ZCL_EXAMPLE');
    });

    it('reports not-found for unknown object', async () => {
      // The mock always returns the same search results; searching for a
      // name that doesn't match the fixture exercises the not-found path.
      const { json } = await callTool('get_object', {
        ...connArgs(),
        objectName: 'DOES_NOT_EXIST',
      });
      const data = json as { found: boolean; message?: string };
      assert.strictEqual(data.found, false);
      assert.ok(data.message?.includes('not found'));
    });
  });

  // ── cts_list_transports ────────────────────────────────────────

  describe('cts_list_transports tool', () => {
    it('returns a list of transports', async () => {
      const { json } = await callTool('cts_list_transports', connArgs());
      const data = json as { count: number; transports: unknown[] };
      assert.strictEqual(data.count, 2);
      assert.ok(Array.isArray(data.transports));
    });
  });

  // ── cts_get_transport ──────────────────────────────────────────

  describe('cts_get_transport tool', () => {
    it('returns transport details', async () => {
      const { json } = await callTool('cts_get_transport', {
        ...connArgs(),
        transport: 'DEVK900001',
      });
      const data = json as { number: string; desc?: string };
      assert.ok(data.number, 'should have transport number');
    });
  });

  // ── cts_create_transport ──────────────────────────────────────

  describe('cts_create_transport tool', () => {
    it('returns a not-yet-implemented error', async () => {
      const { raw } = await callTool('cts_create_transport', {
        ...connArgs(),
        description: 'Test transport',
      });
      const result = raw as {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
      assert.strictEqual(result.isError, true);
      assert.ok(
        result.content[0]?.text.includes('not yet implemented'),
        'error message should mention not yet implemented',
      );
    });
  });

  // ── cts_release_transport ─────────────────────────────────────

  describe('cts_release_transport tool', () => {
    it('returns a not-yet-implemented error', async () => {
      const { raw } = await callTool('cts_release_transport', {
        ...connArgs(),
        transport: 'DEVK900001',
      });
      const result = raw as {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
      assert.strictEqual(result.isError, true);
      assert.ok(
        result.content[0]?.text.includes('not yet implemented'),
        'error message should mention not yet implemented',
      );
    });
  });

  // ── cts_delete_transport ───────────────────────────────────────

  describe('cts_delete_transport tool', () => {
    it('deletes a transport', async () => {
      const { json } = await callTool('cts_delete_transport', {
        ...connArgs(),
        transport: 'DEVK900001',
      });
      const data = json as { transport: string; status: string };
      assert.strictEqual(data.status, 'deleted');
    });
  });

  // ── atc_run ────────────────────────────────────────────────────

  describe('atc_run tool', () => {
    it('runs ATC and returns worklist', async () => {
      const { json } = await callTool('atc_run', {
        ...connArgs(),
        objectUri: '/sap/bc/adt/packages/ZPACKAGE',
      });
      const data = json as { status: string; worklist?: unknown };
      assert.strictEqual(data.status, 'completed');
      assert.ok(data.worklist, 'should contain worklist');
    });
  });

  // ── get_source ─────────────────────────────────────────────────

  describe('get_source tool', () => {
    it('fetches source for a known class by type+name', async () => {
      const { json } = await callTool('get_source', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as { source: string };
      assert.ok(data.source, 'should have source property');
      assert.ok(
        data.source.includes('CLASS'),
        'should return ABAP source text',
      );
    });

    it('fetches source by name only (search-based resolution)', async () => {
      const { json } = await callTool('get_source', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
      });
      const data = json as { source: string };
      assert.ok(data.source, 'should have source property');
      assert.ok(data.source.length > 0, 'should return source');
    });
  });

  // ── update_source ──────────────────────────────────────────────

  describe('update_source tool', () => {
    it('updates source code and returns status', async () => {
      const { json } = await callTool('update_source', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
        sourceCode: 'CLASS zcl_example DEFINITION.\nENDCLASS.\n',
      });
      const data = json as { status: string; object: string };
      assert.strictEqual(data.status, 'updated');
      assert.strictEqual(data.object, 'ZCL_EXAMPLE');
    });
  });

  // ── activate_object ────────────────────────────────────────────

  describe('activate_object tool', () => {
    it('activates a single object', async () => {
      const { json } = await callTool('activate_object', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as { status: string; count: number };
      assert.strictEqual(data.status, 'activated');
      assert.strictEqual(data.count, 1);
    });

    it('activates multiple objects in batch mode', async () => {
      const { json } = await callTool('activate_object', {
        ...connArgs(),
        objects: [
          { objectName: 'ZCL_EXAMPLE', objectType: 'CLAS' },
          { objectName: 'ZIF_EXAMPLE', objectType: 'INTF' },
        ],
      });
      const data = json as { status: string; count: number };
      assert.strictEqual(data.status, 'activated');
      assert.strictEqual(data.count, 2);
    });
  });

  // ── check_syntax ───────────────────────────────────────────────

  describe('check_syntax tool', () => {
    it('runs syntax check and returns structured result', async () => {
      const { json } = await callTool('check_syntax', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as {
        hasErrors: boolean;
        hasWarnings: boolean;
        reports: unknown[];
      };
      assert.strictEqual(typeof data.hasErrors, 'boolean');
      assert.strictEqual(typeof data.hasWarnings, 'boolean');
      assert.ok(Array.isArray(data.reports));
    });
  });

  // ── run_unit_tests ─────────────────────────────────────────────

  describe('run_unit_tests tool', () => {
    it('runs AUnit tests and returns counts', async () => {
      const { json } = await callTool('run_unit_tests', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as {
        totalTests: number;
        passCount: number;
        failCount: number;
        errorCount: number;
      };
      assert.ok(typeof data.totalTests === 'number');
      assert.ok(typeof data.passCount === 'number');
    });
  });

  // ── get_test_classes ───────────────────────────────────────────

  describe('get_test_classes tool', () => {
    it('returns test class source for a class', async () => {
      const { json } = await callTool('get_test_classes', {
        ...connArgs(),
        className: 'ZCL_EXAMPLE',
      });
      const data = json as { source: string };
      assert.ok(data.source, 'should have source property');
      assert.ok(
        data.source.includes('FOR TESTING'),
        'should return test class source with FOR TESTING',
      );
    });
  });

  // ── list_package_objects ───────────────────────────────────────

  describe('list_package_objects tool', () => {
    it('lists objects in a package', async () => {
      const { json } = await callTool('list_package_objects', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
      });
      const data = json as {
        packageName: string;
        count: number;
        objects: unknown[];
      };
      assert.strictEqual(data.packageName, 'ZPACKAGE');
      assert.ok(typeof data.count === 'number');
      assert.ok(Array.isArray(data.objects));
    });
  });

  // ── tool listing ───────────────────────────────────────────────

  describe('tool listing', () => {
    it('lists all registered tools', async () => {
      const tools = await client.listTools();
      const names = new Set(tools.tools.map((t) => t.name));
      const expected = [
        'discovery',
        'system_info',
        'search_objects',
        'get_object',
        'cts_list_transports',
        'cts_get_transport',
        'cts_create_transport',
        'cts_release_transport',
        'cts_delete_transport',
        'atc_run',
        'get_source',
        'update_source',
        'activate_object',
        'check_syntax',
        'run_unit_tests',
        'get_test_classes',
        'list_package_objects',
      ];
      for (const name of expected) {
        assert.ok(names.has(name), `tool "${name}" should be listed`);
      }
    });
  });
});
