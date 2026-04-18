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

  // ── cts_search_transports ──────────────────────────────────────

  describe('cts_search_transports tool', () => {
    it('returns transports from FIND endpoint', async () => {
      const { json } = await callTool('cts_search_transports', {
        ...connArgs(),
        user: '*',
        trfunction: '*',
      });
      const data = json as {
        count: number;
        transports: Array<{ TRKORR: string }>;
      };
      assert.ok(typeof data.count === 'number');
      assert.ok(Array.isArray(data.transports));
      assert.ok(data.count >= 1, 'mock FIND fixture returns at least 1');
    });

    it('filters by status client-side', async () => {
      const { json } = await callTool('cts_search_transports', {
        ...connArgs(),
        status: 'R',
      });
      const data = json as {
        transports: Array<{ TRSTATUS: string }>;
      };
      for (const t of data.transports) {
        assert.strictEqual(t.TRSTATUS, 'R');
      }
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

    it('runs AUnit tests with coverage and emits a JaCoCo report', async () => {
      const { json } = await callTool('run_unit_tests', {
        ...connArgs(),
        objectName: 'ZCL_EXAMPLE',
        objectType: 'CLAS',
        coverage: true,
        coverageFormat: 'jacoco',
      });
      const data = json as {
        testResults: { totalTests: number };
        coverage: { format: string; xml: string; warning?: string };
      };
      assert.ok(typeof data.testResults?.totalTests === 'number');
      assert.strictEqual(data.coverage.format, 'jacoco');
      assert.ok(
        data.coverage.xml.includes('<!DOCTYPE report PUBLIC'),
        `coverage XML must contain JaCoCo DOCTYPE; payload: ${JSON.stringify(data.coverage).slice(0, 500)}`,
      );
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

    it('rejects unscoped searches', async () => {
      const { raw } = await callTool('grep_objects', {
        ...connArgs(),
        pattern: 'METHOD',
      });
      assert.strictEqual(raw.isError, true);
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
      const data = json as {
        status: string;
        objectName: string;
        objectType: string;
      };
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
      const data = json as {
        status: string;
        packageName: string;
        count: number;
      };
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
      assert.ok(
        typeof data.lockHandle === 'string',
        'should return lockHandle',
      );
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
      assert.ok(
        typeof json === 'string',
        'should return formatted source as string',
      );
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
      assert.strictEqual(
        typeof data.features.atc,
        'boolean',
        'features.atc should be boolean',
      );
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

  // ── import tools ───────────────────────────────────────────────

  describe('import_object tool', () => {
    it('invokes ImportService without throwing and returns a text response', async () => {
      const fs = await import('node:fs');
      const os = await import('node:os');
      const path = await import('node:path');
      const outputDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'adt-mcp-import-object-'),
      );
      try {
        const { raw } = await callTool('import_object', {
          ...connArgs(),
          objectType: 'CLAS',
          objectName: 'ZCL_EXAMPLE',
          outputDir,
        });
        const res = raw as { content: Array<{ type: string; text: string }> };
        assert.ok(Array.isArray(res.content), 'tool must return content array');
        assert.ok(res.content[0]?.text, 'tool must return text payload');
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });
  });

  describe('import_package tool', () => {
    it('invokes ImportService without throwing and returns a text response', async () => {
      const fs = await import('node:fs');
      const os = await import('node:os');
      const path = await import('node:path');
      const outputDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'adt-mcp-import-pkg-'),
      );
      try {
        const { raw } = await callTool('import_package', {
          ...connArgs(),
          packageName: 'ZPACKAGE',
          outputDir,
          recursive: false,
        });
        const res = raw as { content: Array<{ type: string; text: string }> };
        assert.ok(Array.isArray(res.content));
        assert.ok(res.content[0]?.text);
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });
  });

  describe('import_transport tool', () => {
    it('invokes ImportService without throwing and returns a text response', async () => {
      const fs = await import('node:fs');
      const os = await import('node:os');
      const path = await import('node:path');
      const outputDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'adt-mcp-import-tr-'),
      );
      try {
        const { raw } = await callTool('import_transport', {
          ...connArgs(),
          transportNumber: 'DEVK900001',
          outputDir,
        });
        const res = raw as { content: Array<{ type: string; text: string }> };
        assert.ok(Array.isArray(res.content));
        assert.ok(res.content[0]?.text);
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });
  });

  // ── cts_update_transport ───────────────────────────────────────

  describe('cts_update_transport tool', () => {
    it('updates a transport description', async () => {
      const { json } = await callTool('cts_update_transport', {
        ...connArgs(),
        transportNumber: 'DEVK900001',
        description: 'Updated description',
      });
      const data = json as { status: string; transport: string };
      assert.strictEqual(data.status, 'updated');
      assert.strictEqual(data.transport, 'DEVK900001');
    });

    it('rejects calls with no update fields', async () => {
      const { raw } = await callTool('cts_update_transport', {
        ...connArgs(),
        transportNumber: 'DEVK900001',
      });
      const result = raw as { isError?: boolean };
      assert.ok(result.isError, 'should error when no fields provided');
    });
  });

  // ── cts_reassign_transport ─────────────────────────────────────

  describe('cts_reassign_transport tool', () => {
    it('reassigns a transport to a new owner', async () => {
      const { json } = await callTool('cts_reassign_transport', {
        ...connArgs(),
        transportNumber: 'DEVK900001',
        targetUser: 'NEWOWNER',
        recursive: true,
      });
      const data = json as {
        status: string;
        transport: string;
        newOwner: string;
        recursive: boolean;
      };
      assert.strictEqual(data.status, 'reassigned');
      assert.strictEqual(data.newOwner, 'NEWOWNER');
      assert.strictEqual(data.recursive, true);
    });
  });

  // ── stat_package ───────────────────────────────────────────────

  describe('stat_package tool', () => {
    it('returns exists=true with metadata for a known package', async () => {
      const { json } = await callTool('stat_package', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
      });
      const data = json as { exists: boolean; metadata?: unknown };
      assert.strictEqual(data.exists, true);
      assert.ok(data.metadata, 'should include metadata');
    });
  });

  // ── get_package ────────────────────────────────────────────────

  describe('get_package tool', () => {
    it('returns package metadata without objects by default', async () => {
      const { json } = await callTool('get_package', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
      });
      const data = json as {
        packageName: string;
        metadata: unknown;
        objects?: unknown;
      };
      assert.strictEqual(data.packageName, 'ZPACKAGE');
      assert.ok(data.metadata, 'should include metadata');
      assert.strictEqual(data.objects, undefined);
    });

    it('returns package metadata with objects when includeObjects=true', async () => {
      const { json } = await callTool('get_package', {
        ...connArgs(),
        packageName: 'ZPACKAGE',
        includeObjects: true,
      });
      const data = json as {
        packageName: string;
        metadata: unknown;
        objects?: unknown[];
        count?: number;
      };
      assert.strictEqual(data.packageName, 'ZPACKAGE');
      assert.ok(Array.isArray(data.objects), 'should include objects array');
    });
  });

  // ── lookup_user ────────────────────────────────────────────────

  describe('lookup_user tool', () => {
    it('returns the current user when no query given', async () => {
      const { json } = await callTool('lookup_user', connArgs());
      const data = json as { mode: string; user: { userName: string } };
      assert.strictEqual(data.mode, 'current');
      assert.ok(data.user.userName, 'should have userName');
    });

    it('returns exact user lookup result', async () => {
      const { json } = await callTool('lookup_user', {
        ...connArgs(),
        query: 'DEVELOPER',
      });
      const data = json as { mode: string; count: number; users: unknown[] };
      assert.strictEqual(data.mode, 'exact');
      assert.ok(Array.isArray(data.users));
    });

    it('returns wildcard search results', async () => {
      const { json } = await callTool('lookup_user', {
        ...connArgs(),
        query: 'DEV*',
      });
      const data = json as { mode: string; count: number; users: unknown[] };
      assert.strictEqual(data.mode, 'search');
      assert.ok(Array.isArray(data.users));
    });
  });

  // ── DDIC / CDS read tools + run_abap ──────────────────────────

  describe('get_domain tool', () => {
    it('returns DDIC domain metadata', async () => {
      const { json } = await callTool('get_domain', {
        ...connArgs(),
        domainName: 'ZDOM_SAMPLE',
      });
      assert.ok(json, 'should return domain metadata');
    });
  });

  describe('get_data_element tool', () => {
    it('returns DDIC data element metadata', async () => {
      const { json } = await callTool('get_data_element', {
        ...connArgs(),
        dataElementName: 'ZDTEL_SAMPLE',
      });
      assert.ok(json, 'should return data element metadata');
    });
  });

  describe('get_structure tool', () => {
    it('returns DDIC structure metadata', async () => {
      const { json, raw } = await callTool('get_structure', {
        ...connArgs(),
        structureName: 'ZSTRUCT_SAMPLE',
      });
      const result = raw as { isError?: boolean };
      assert.ok(!result.isError, 'should not return an error');
      assert.ok(json !== undefined, 'should return a result');
    });

    it('returns DDIC structure with source when includeSource=true', async () => {
      const { json, raw } = await callTool('get_structure', {
        ...connArgs(),
        structureName: 'ZSTRUCT_SAMPLE',
        includeSource: true,
      });
      const result = raw as { isError?: boolean };
      assert.ok(!result.isError);
      const data = json as { source?: string };
      assert.strictEqual(typeof data.source, 'string');
    });
  });

  describe('get_cds_ddl tool', () => {
    it('returns CDS DDL metadata', async () => {
      const { raw } = await callTool('get_cds_ddl', {
        ...connArgs(),
        ddlName: 'ZDDL_SAMPLE',
      });
      const result = raw as { isError?: boolean };
      assert.ok(!result.isError, 'should not return an error');
    });

    it('returns CDS DDL metadata + source', async () => {
      const { json, raw } = await callTool('get_cds_ddl', {
        ...connArgs(),
        ddlName: 'ZDDL_SAMPLE',
        includeSource: true,
      });
      const result = raw as { isError?: boolean };
      assert.ok(!result.isError);
      const data = json as { source?: string };
      assert.strictEqual(typeof data.source, 'string');
    });
  });

  describe('get_cds_dcl tool', () => {
    it('returns CDS DCL metadata', async () => {
      const { raw } = await callTool('get_cds_dcl', {
        ...connArgs(),
        dclName: 'ZDCL_SAMPLE',
      });
      const result = raw as { isError?: boolean };
      assert.ok(!result.isError);
    });
  });

  describe('create_object tool (DDIC/CDS types)', () => {
    it('creates a DOMA object', async () => {
      const { json } = await callTool('create_object', {
        ...connArgs(),
        objectName: 'ZDOM_NEW',
        objectType: 'DOMA',
        description: 'New test domain',
        packageName: 'ZPACKAGE',
        transport: 'DEVK900001',
      });
      const data = json as { status: string; objectType: string };
      assert.strictEqual(data.status, 'created');
      assert.strictEqual(data.objectType, 'DOMA');
    });

    it('creates a DDLS object', async () => {
      const { json } = await callTool('create_object', {
        ...connArgs(),
        objectName: 'ZDDL_NEW',
        objectType: 'DDLS',
        description: 'New CDS DDL',
        packageName: 'ZPACKAGE',
        transport: 'DEVK900001',
      });
      const data = json as { status: string; objectType: string };
      assert.strictEqual(data.status, 'created');
      assert.strictEqual(data.objectType, 'DDLS');
    });
  });

  describe('delete_object tool (DDIC/CDS types)', () => {
    it('deletes a DOMA object', async () => {
      const { json } = await callTool('delete_object', {
        ...connArgs(),
        objectName: 'ZDOM_SAMPLE',
        objectType: 'DOMA',
        transport: 'DEVK900001',
      });
      const data = json as { status: string };
      assert.strictEqual(data.status, 'deleted');
    });

    it('deletes a DDLS object', async () => {
      const { json } = await callTool('delete_object', {
        ...connArgs(),
        objectName: 'ZDDL_SAMPLE',
        objectType: 'DDLS',
        transport: 'DEVK900001',
      });
      const data = json as { status: string };
      assert.strictEqual(data.status, 'deleted');
    });
  });

  describe('run_abap tool', () => {
    it('runs an ABAP snippet and returns classrun output', async () => {
      const { json } = await callTool('run_abap', {
        ...connArgs(),
        source: "out->write( 'hello' ).",
      });
      const data = json as {
        className: string;
        output: string;
        classDeleted: boolean;
      };
      assert.ok(data.className, 'should return className');
      assert.strictEqual(typeof data.output, 'string');
      assert.strictEqual(typeof data.classDeleted, 'boolean');
    });

    it('keeps the class when keepClass=true', async () => {
      const { json } = await callTool('run_abap', {
        ...connArgs(),
        source: "out->write( 'keep' ).",
        keepClass: true,
      });
      const data = json as { classDeleted: boolean };
      assert.strictEqual(data.classDeleted, false);
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
        'cts_search_transports',
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
        // Import tools (mirror `adt import object|package|transport`)
        'import_object',
        'import_package',
        'import_transport',
        // CTS + package parity tools
        'cts_update_transport',
        'cts_reassign_transport',
        'stat_package',
        'get_package',
        'lookup_user',
        // DDIC/CDS read tools + run_abap
        'run_abap',
        'get_domain',
        'get_data_element',
        'get_structure',
        'get_cds_ddl',
        'get_cds_dcl',
      ];
      for (const name of expected) {
        assert.ok(names.has(name), `tool "${name}" should be listed`);
      }
    });
  });
});
