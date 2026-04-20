/**
 * HTTP-transport integration tests for adt-mcp.
 *
 * Spins up `startHttpServer` with a custom `clientFactory` that targets
 * the shared mock ADT backend, drives an MCP `Client` through
 * `StreamableHTTPClientTransport`, and exercises the sap_connect /
 * sap_disconnect lifecycle end-to-end.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startHttpServer } from '../src/lib/http/server.js';
import { createSessionRegistry } from '../src/lib/session/registry.js';
import {
  createMockAdtServer,
  type MockAdtServer,
} from '../src/lib/mock/server.js';
import type { ConnectionParams } from '../src/lib/types.js';
import type { RunningHttpServer } from '../src/lib/http/server.js';

let mockAdt: MockAdtServer;
let mockPort: number;
let http: RunningHttpServer;

const mockCredential = randomBytes(16).toString('hex');

/**
 * Inject a custom clientFactory by monkey-patching the createMcpServer
 * module. Cleaner path: `startHttpServer` doesn't currently accept a
 * clientFactory override (owned by W1-A), so we instead configure the
 * registry + multi-system resolver to point at the mock.
 */
function buildMockParams(): ConnectionParams {
  return {
    baseUrl: `http://localhost:${mockPort}`,
    username: 'DEVELOPER',
    password: mockCredential,
    client: '100',
  };
}

describe('adt-mcp HTTP integration', () => {
  before(async () => {
    mockAdt = createMockAdtServer();
    const info = await mockAdt.start();
    mockPort = info.port;

    // Use a pre-built registry so we share it across requests, and a
    // multi-system resolver keyed on "MOCK" → mock backend.
    const registry = createSessionRegistry({ ttlMs: 0 });

    http = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      registry,
      multiSystem: {
        systems: { MOCK: { baseUrl: `http://localhost:${mockPort}` } },
        resolve: (id: string) =>
          id === 'MOCK' ? buildMockParams() : undefined,
      },
      // Silent logger — the default writes to stderr.
      log: () => undefined,
    });
  });

  after(async () => {
    await http?.close();
    await mockAdt?.stop();
  });

  async function connectClient(): Promise<{
    client: Client;
    transport: StreamableHTTPClientTransport;
  }> {
    const transport = new StreamableHTTPClientTransport(new URL(http.url));
    const client = new Client({ name: 'http-it', version: '0.0.1' });
    await client.connect(transport);
    return { client, transport };
  }

  it('initializes an MCP session and lists the new sap_* tools', async () => {
    const { client, transport } = await connectClient();
    try {
      const tools = await client.listTools();
      const names = tools.tools.map((t) => t.name);
      assert.ok(names.includes('sap_connect'), 'sap_connect registered');
      assert.ok(names.includes('sap_disconnect'), 'sap_disconnect registered');
      assert.ok(names.includes('system_info'), 'system_info still registered');
    } finally {
      await transport.close();
    }
  });

  it('sap_connect with explicit baseUrl, then system_info reuses the session', async () => {
    const { client, transport } = await connectClient();
    try {
      // sap_connect with explicit args
      const connectRes = await client.callTool({
        name: 'sap_connect',
        arguments: buildMockParams() as unknown as Record<string, unknown>,
      });
      const connectText = (
        connectRes.content as Array<{ type: string; text: string }>
      )[0].text;
      const connectJson = JSON.parse(connectText) as {
        ok: boolean;
        source: string;
        mcpSessionId: string;
      };
      assert.strictEqual(connectJson.ok, true, connectText);
      assert.strictEqual(connectJson.source, 'explicit');
      assert.ok(connectJson.mcpSessionId);

      // Now call system_info WITH explicit baseUrl (existing tools still
      // take legacy args until a later wave migrates them). We mainly
      // assert that the HTTP round-trip works and the session is alive.
      const infoRes = await client.callTool({
        name: 'system_info',
        arguments: buildMockParams() as unknown as Record<string, unknown>,
      });
      assert.ok(!infoRes.isError, JSON.stringify(infoRes));

      // sap_disconnect
      const discRes = await client.callTool({
        name: 'sap_disconnect',
        arguments: {},
      });
      const discText = (
        discRes.content as Array<{ type: string; text: string }>
      )[0].text;
      const discJson = JSON.parse(discText) as {
        ok: boolean;
        hadSession: boolean;
      };
      assert.strictEqual(discJson.ok, true);
      assert.strictEqual(discJson.hadSession, true);
    } finally {
      await transport.close();
    }
  });

  it('sap_connect with systemId resolves via multi-system config', async () => {
    const { client, transport } = await connectClient();
    try {
      const res = await client.callTool({
        name: 'sap_connect',
        arguments: { systemId: 'MOCK' },
      });
      const text = (res.content as Array<{ type: string; text: string }>)[0]
        .text;
      assert.ok(!res.isError, text);
      const json = JSON.parse(text) as {
        ok: boolean;
        source: string;
        systemId?: string;
      };
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.source, 'multi-system');
      assert.strictEqual(json.systemId, 'MOCK');
    } finally {
      await transport.close();
    }
  });

  it('sap_connect is idempotent on the same MCP session', async () => {
    const { client, transport } = await connectClient();
    try {
      await client.callTool({
        name: 'sap_connect',
        arguments: { systemId: 'MOCK' },
      });
      const res = await client.callTool({
        name: 'sap_connect',
        arguments: { systemId: 'MOCK' },
      });
      const text = (res.content as Array<{ type: string; text: string }>)[0]
        .text;
      const json = JSON.parse(text) as {
        ok: boolean;
        alreadyConnected?: boolean;
      };
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.alreadyConnected, true);
    } finally {
      await transport.close();
    }
  });

  it('sap_connect fails when no credentials can be resolved', async () => {
    const { client, transport } = await connectClient();
    try {
      // No baseUrl, no systemId → both priority branches skip, resolver
      // throws. We deliberately avoid passing a bogus systemId here
      // because that would fall through to @abapify/adt-cli's on-disk
      // auth store, which may call process.exit(1) on auth failures.
      const res = await client.callTool({
        name: 'sap_connect',
        arguments: {},
      });
      assert.strictEqual(res.isError, true);
    } finally {
      await transport.close();
    }
  });

  it('sap_disconnect without an active session is a no-op', async () => {
    const { client, transport } = await connectClient();
    try {
      const res = await client.callTool({
        name: 'sap_disconnect',
        arguments: {},
      });
      const text = (res.content as Array<{ type: string; text: string }>)[0]
        .text;
      const json = JSON.parse(text) as {
        ok: boolean;
        hadSession: boolean;
      };
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.hadSession, false);
    } finally {
      await transport.close();
    }
  });
});
