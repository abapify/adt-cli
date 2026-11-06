import assert from 'node:assert/strict';
import { test } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z as z4 } from 'zod';
import { registerCloneObjectTool } from '../src/lib/tools/clone-object.js';
import { registerCallRfcTool } from '../src/lib/tools/call-rfc.js';
import { registerLintAbapTool } from '../src/lib/tools/lint-abap.js';
import { destinationModeServer } from '../src/lib/tools/destination-mode.js';
import type { ToolContext } from '../src/lib/types.js';

async function withClient(
  register: (server: McpServer) => void,
  check: (client: Client) => Promise<void>,
) {
  const server = new McpServer({
    name: 'offline-registration-test',
    version: '1',
  });
  const client = new Client({ name: 'offline-test-client', version: '1' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  try {
    register(server);
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await check(client);
  } finally {
    await client.close();
    await server.close();
  }
}

test('clone rejects unsupported source types before any client or target acquisition', async () => {
  let acquisitions = 0;
  const context: ToolContext = {
    getClient() {
      acquisitions++;
      throw new Error('No SAP access is allowed in this test');
    },
  };
  await withClient(
    (server) => registerCloneObjectTool(server, context),
    async (client) => {
      for (const sourceObjectType of [
        'INCL',
        'DDLS',
        'DCLS',
        'BDEF',
        'SRVD',
        'DOMA',
      ]) {
        const result = await client.callTool({
          name: 'clone_object',
          arguments: {
            baseUrl: 'https://offline.invalid',
            sourceObjectType,
            sourceObjectName: 'Z_SOURCE',
            targetObjectName: 'Z_TARGET',
          },
        });
        assert.equal(result.isError, true);
        assert.deepEqual(result.content, [
          {
            type: 'text',
            text: `Object type '${sourceObjectType}' is not supported for cloning. Supported types: PROG, CLAS, INTF`,
          },
        ]);
      }
    },
  );
  assert.equal(acquisitions, 0);
});

for (const [version, z] of [['v4', z4]] as const) {
  test(`destination-mode registration preserves ${version} schema constraints`, async () => {
    await withClient(
      (server) => {
        const destination = destinationModeServer(server);
        destination.tool(
          'system_info',
          'Offline schema witness',
          { label: z.string().min(2) },
          async () => ({ content: [] }),
        );
      },
      async (client) => {
        const list = await client.listTools();
        const tool = list.tools.find((entry) => entry.name === 'system_info');
        assert.ok(tool);
        assert.equal(
          tool.inputSchema.properties?.destination !== undefined,
          true,
        );
        assert.deepEqual(tool.inputSchema.properties?.label, {
          type: 'string',
          minLength: 2,
        });
      },
    );
  });
}

test('record parameters produce valid Zod 4 schemas for RFC and lint tools', async () => {
  const context: ToolContext = {
    getClient() {
      throw new Error('Offline only');
    },
  };
  await withClient(
    (server) => {
      registerCallRfcTool(server, context);
      registerLintAbapTool(server, context);
    },
    async (client) => {
      const list = await client.listTools();
      for (const [name, property] of [
        ['call_rfc', 'parameters'],
        ['lint_abap', 'ruleOverrides'],
      ]) {
        const tool = list.tools.find((entry) => entry.name === name);
        assert.ok(tool);
        assert.deepEqual(tool.inputSchema.properties?.[property], {
          type: 'object',
          propertyNames: { type: 'string' },
          additionalProperties: {},
          description:
            name === 'call_rfc'
              ? 'Flat key/value map of RFC parameters. Scalars as strings; structures as objects; tables as arrays of objects.'
              : 'Optional per-rule override config passed to abaplint',
        });
      }
    },
  );
});
