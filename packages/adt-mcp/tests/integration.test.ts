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

  // ── cts_create_transport ───────────────────────────────────────

  describe('cts_create_transport tool', () => {
    it('creates a transport and returns transport number', async () => {
      const { json } = await callTool('cts_create_transport', {
        ...connArgs(),
        description: 'Test transport',
        type: 'K',
      });
      const data = json as { status: string; transport: string };
      assert.strictEqual(data.status, 'created');
    });
  });

  // ── cts_release_transport ──────────────────────────────────────

  describe('cts_release_transport tool', () => {
    it('releases a transport and returns status', async () => {
      const { json } = await callTool('cts_release_transport', {
        ...connArgs(),
        transport: 'DEVK900001',
      });
      const data = json as { status: string; transport: string };
      assert.strictEqual(data.status, 'released');
      assert.strictEqual(data.transport, 'DEVK900001');
    });
  });

  // ── grep_objects ───────────────────────────────────────────────

  describe('grep_objects tool', () => {
    it('searches for a pattern within named objects', async () => {
      const { json } = await callTool('grep_objects', {
        ...connArgs(),
        pattern: 'METHOD',
        objects: [{ objectName: 'ZCL_EXAMPLE', objectType: 'CLAS' }],
      });
      const data = json as { pattern: string; results: unknown };
      assert.strictEqual(data.pattern, 'METHOD');
      assert.ok(data.results !== undefined);
    });
  });

  // ── grep_packages ──────────────────────────────────────────────

  describe('grep_packages tool', () => {
    it('searches for a pattern across a package', async () => {
      const { json } = await callTool('grep_packages', {
        ...connArgs(),
        pattern: 'METHOD',
        packageName: 'ZPACKAGE',
      });
      const data = json as { pattern: string; packageName: string };
      assert.strictEqual(data.pattern, 'METHOD');
      assert.strictEqual(data.packageName, 'ZPACKAGE');
    });
  });

  // ── get_table ──────────────────────────────────────────────────

  describe('get_table tool', () => {
    it('returns DDIC table definition', async () => {
      const { json } = await callTool('get_table', {
        ...connArgs(),
        tableName: 'MARA',
      });
      assert.ok(json !== undefined, 'should return table definition');
    });
  });

  // ── get_table_contents ─────────────────────────────────────────

  describe('get_table_contents tool', () => {
    it('returns table data rows', async () => {
      const { json } = await callTool('get_table_contents', {
        ...connArgs(),
        tableName: 'T001',
        maxRows: 10,
      });
      const data = json as { table: string; query: string };
      assert.strictEqual(data.table, 'T001');
      assert.ok(data.query.includes('SELECT'));
    });
  });

  // ── run_query ──────────────────────────────────────────────────

  describe('run_query tool', () => {
    it('executes a SQL query and returns results', async () => {
      const { json } = await callTool('run_query', {
        ...connArgs(),
        query: "SELECT * FROM T001 WHERE MANDT = '100'",
        maxRows: 5,
      });
      const data = json as { query: string };
      assert.ok(data.query.includes('SELECT'));
    });

    it('rejects non-SELECT statements', async () => {
      const { raw } = await callTool('run_query', {
        ...connArgs(),
        query: "DELETE FROM T001 WHERE MANDT = '100'",
      });
      const result = raw as { isError?: boolean };
      assert.ok(result.isError, 'should return error for non-SELECT statement');
    });
  });

  // ── find_definition ────────────────────────────────────────────

  describe('find_definition tool', () => {
    it('returns navigation target for a symbol', async () => {
      const { json } = await callTool('find_definition', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      assert.ok(json !== undefined, 'should return navigation target');
    });
  });

  // ── find_references ────────────────────────────────────────────

  describe('find_references tool', () => {
    it('returns usages for an object', async () => {
      const { json } = await callTool('find_references', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as { objectName: string };
      assert.strictEqual(data.objectName, 'ZCL_EXAMPLE');
    });
  });

  // ── get_callers_of ─────────────────────────────────────────────

  describe('get_callers_of tool', () => {
    it('returns callers of an object', async () => {
      const { json } = await callTool('get_callers_of', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as { objectName: string; callers: unknown };
      assert.strictEqual(data.objectName, 'ZCL_EXAMPLE');
      assert.ok(data.callers !== undefined);
    });
  });

  // ── get_callees_of ─────────────────────────────────────────────

  describe('get_callees_of tool', () => {
    it('returns callees of an object', async () => {
      const { json } = await callTool('get_callees_of', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as { objectName: string; callees: unknown };
      assert.strictEqual(data.objectName, 'ZCL_EXAMPLE');
      assert.ok(data.callees !== undefined);
    });
  });

  // ── create_object ──────────────────────────────────────────────

  describe('create_object tool', () => {
    it('creates a CLAS object', async () => {
      const { json } = await callTool('create_object', {
        ...connArgs(),
        objectName: 'ZCL_NEW',
        objectType: 'CLAS',
        description: 'New test class',
        packageName: 'ZPACKAGE',
        transport: 'DEVK900001',
      });
      const data = json as { status: string; objectName: string; objectType: string };
      assert.strictEqual(data.status, 'created');
      assert.strictEqual(data.objectName, 'ZCL_NEW');
      assert.strictEqual(data.objectType, 'CLAS');
    });

    it('creates a PROG object', async () => {
      const { json } = await callTool('create_object', {
        ...connArgs(),
        objectName: 'ZPROG_NEW',
        objectType: 'PROG',
        description: 'New test program',
        packageName: 'ZPACKAGE',
        transport: 'DEVK900001',
      });
      const data = json as { status: string; objectType: string };
      assert.strictEqual(data.status, 'created');
      assert.strictEqual(data.objectType, 'PROG');
    });

    it('returns error for unsupported type', async () => {
      const { raw } = await callTool('create_object', {
        ...connArgs(),
        objectName: 'ZFB01',
        objectType: 'TRAN',
        description: 'Unsupported type',
      });
      const result = raw as { isError?: boolean };
      assert.ok(result.isError, 'should return error for unsupported type');
    });
  });

  // ── delete_object ──────────────────────────────────────────────

  describe('delete_object tool', () => {
    it('deletes a CLAS object', async () => {
      const { json } = await callTool('delete_object', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
        transport: 'DEVK900001',
      });
      const data = json as { status: string; objectName: string };
      assert.strictEqual(data.status, 'deleted');
      assert.strictEqual(data.objectName, 'ZCL_EXAMPLE');
    });
  });

  // ── activate_package ───────────────────────────────────────────

  describe('activate_package tool', () => {
    it('activates all inactive objects in a package', async () => {
      const { json } = await callTool('activate_package', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
      });
      const data = json as { status: string; packageName: string; count: number };
      assert.ok(
        data.status === 'activated' || data.status === 'no_inactive_objects',
        'should return activated or no_inactive_objects status',
      );
      assert.strictEqual(data.packageName, 'ZPACKAGE');
    });
  });

  // ── get_function_group ─────────────────────────────────────────

  describe('get_function_group tool', () => {
    it('returns function group metadata', async () => {
      const { json } = await callTool('get_function_group', {
        ...connArgs(),
        groupName: 'ZFUGR_UTIL',
      });
      const data = json as { metadata: unknown };
      assert.ok(data.metadata, 'should return metadata');
    });

    it('returns function group with source when includeSource is true', async () => {
      const { json } = await callTool('get_function_group', {
        ...connArgs(),
        groupName: 'ZFUGR_UTIL',
        includeSource: true,
      });
      const data = json as { metadata: unknown; source: string };
      assert.ok(data.metadata, 'should return metadata');
      assert.ok(typeof data.source === 'string', 'should return source string');
    });
  });

  // ── get_function ──────────────────────────────────────────────

  describe('get_function tool', () => {
    it('returns function module metadata', async () => {
      const { json } = await callTool('get_function', {
        ...connArgs(),
        groupName: 'ZFUGR_UTIL',
        functionName: 'Z_MY_FUNCTION',
      });
      const data = json as { metadata: unknown };
      assert.ok(data.metadata, 'should return metadata');
    });

    it('returns function module with source when includeSource is true', async () => {
      const { json } = await callTool('get_function', {
        ...connArgs(),
        groupName: 'ZFUGR_UTIL',
        functionName: 'Z_MY_FUNCTION',
        includeSource: true,
      });
      const data = json as { metadata: unknown; source: string };
      assert.ok(data.metadata, 'should return metadata');
      assert.ok(typeof data.source === 'string', 'should return source string');
    });
  });

  // ── lock_object ───────────────────────────────────────────────

  describe('lock_object tool', () => {
    it('acquires a lock and returns lock handle', async () => {
      const { json } = await callTool('lock_object', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      const data = json as { status: string; lockHandle: string };
      assert.strictEqual(data.status, 'locked');
      assert.ok(typeof data.lockHandle === 'string', 'should return lockHandle');
    });
  });

  // ── unlock_object ─────────────────────────────────────────────

  describe('unlock_object tool', () => {
    it('releases a lock', async () => {
      const { json } = await callTool('unlock_object', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
        lockHandle: 'MOCK_LOCK_HANDLE_001',
      });
      const data = json as { status: string };
      assert.strictEqual(data.status, 'unlocked');
    });
  });

  // ── get_object_structure ──────────────────────────────────────

  describe('get_object_structure tool', () => {
    it('returns object structure for a CLAS', async () => {
      const { json } = await callTool('get_object_structure', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      assert.ok(json, 'should return object structure');
    });
  });

  // ── get_type_hierarchy ────────────────────────────────────────

  describe('get_type_hierarchy tool', () => {
    it('returns type hierarchy for a class', async () => {
      const { json } = await callTool('get_type_hierarchy', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
      });
      assert.ok(json, 'should return type hierarchy');
    });
  });

  // ── pretty_print ──────────────────────────────────────────────

  describe('pretty_print tool', () => {
    it('returns formatted ABAP source code', async () => {
      const { json } = await callTool('pretty_print', {
        ...connArgs(),
        sourceCode: 'class zcl_example definition.\nendclass.',
      });
      assert.ok(typeof json === 'string', 'should return formatted source as string');
    });
  });

  // ── create_package ────────────────────────────────────────────

  describe('create_package tool', () => {
    it('creates a package', async () => {
      const { json } = await callTool('create_package', {
        ...connArgs(),
        packageName: 'ZNEWPKG',
        description: 'New test package',
      });
      const data = json as { status: string; packageName: string };
      assert.strictEqual(data.status, 'created');
      assert.strictEqual(data.packageName, 'ZNEWPKG');
    });
  });

  // ── get_installed_components ──────────────────────────────────

  describe('get_installed_components tool', () => {
    it('returns installed software components', async () => {
      const { json } = await callTool('get_installed_components', connArgs());
      assert.ok(json, 'should return software components');
    });
  });

  // ── get_features ──────────────────────────────────────────────

  describe('get_features tool', () => {
    it('returns feature detection result', async () => {
      const { json } = await callTool('get_features', connArgs());
      const data = json as { features: Record<string, boolean> };
      assert.ok(data.features, 'should return features object');
      assert.strictEqual(typeof data.features.atc, 'boolean', 'features.atc should be boolean');
    });
  });

  // ── clone_object ──────────────────────────────────────────────

  describe('clone_object tool', () => {
    it('clones a CLAS object', async () => {
      const { json } = await callTool('clone_object', {
        ...connArgs(),
        sourceObjectName: 'ZCL_EXAMPLE',
        sourceObjectType: 'CLAS',
        targetObjectName: 'ZCL_EXAMPLE_COPY',
        targetDescription: 'Copy of ZCL_EXAMPLE',
      });
      const data = json as { status: string; targetObject: { name: string } };
      assert.strictEqual(data.status, 'cloned');
      assert.strictEqual(data.targetObject.name, 'ZCL_EXAMPLE_COPY');
    });
  });

  // ── publish_service_binding ───────────────────────────────────

  describe('publish_service_binding tool', () => {
    it('publishes a service binding', async () => {
      const { json } = await callTool('publish_service_binding', {
        ...connArgs(),
        bindingName: 'ZUI_MYAPP_O4',
      });
      const data = json as { status: string; bindingName: string };
      assert.strictEqual(data.status, 'published');
      assert.strictEqual(data.bindingName, 'ZUI_MYAPP_O4');
    });

    it('unpublishes a service binding', async () => {
      const { json } = await callTool('publish_service_binding', {
        ...connArgs(),
        bindingName: 'ZUI_MYAPP_O4',
        unpublish: true,
      });
      const data = json as { status: string };
      assert.strictEqual(data.status, 'unpublished');
    });
  });

  // ── get_git_types ─────────────────────────────────────────────

  describe('get_git_types tool', () => {
    it('returns abapGit-eligible objects', async () => {
      const { json } = await callTool('get_git_types', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
      });
      const data = json as { packageName: string; objects: unknown };
      assert.strictEqual(data.packageName, 'ZPACKAGE');
      assert.ok(data.objects, 'should return objects');
    });
  });

  // ── git_export ────────────────────────────────────────────────

  describe('git_export tool', () => {
    it('returns package export in abapGit format', async () => {
      const { json } = await callTool('git_export', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
      });
      const data = json as { packageName: string; export: unknown };
      assert.strictEqual(data.packageName, 'ZPACKAGE');
      assert.ok(data.export, 'should return export data');
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
        // High-priority tools (#H1–#H8)
        'grep_objects',
        'grep_packages',
        'get_table',
        'get_table_contents',
        'run_query',
        'find_definition',
        'find_references',
        'get_callers_of',
        'get_callees_of',
        'create_object',
        'delete_object',
        'activate_package',
        // Medium-priority tools (#M1–#M10)
        'get_function_group',
        'get_function',
        'lock_object',
        'unlock_object',
        'get_object_structure',
        'get_type_hierarchy',
        'pretty_print',
        'create_package',
        'get_installed_components',
        'get_features',
        'clone_object',
        'publish_service_binding',
        'get_git_types',
        'git_export',
      ];
      for (const name of expected) {
        assert.ok(names.has(name), `tool "${name}" should be listed`);
      }
    });
  });
});
