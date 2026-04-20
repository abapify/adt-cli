/**
 * HTTP integration test for Wave 3 changesets.
 *
 * Drives the full four-verb cycle over `StreamableHTTPClientTransport`
 * against a real HTTP MCP server pointed at the in-process mock ADT
 * backend. Verifies:
 *   - sap_connect + changeset_begin + changeset_add + changeset_commit
 *     activates exactly once (batch)
 *   - a second session can independently begin + add + rollback without
 *     activating
 *   - rollback path releases the lock on the mock server
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
import type { RunningHttpServer } from '../src/lib/http/server.js';

let mockAdt: MockAdtServer;
let mockPort: number;
let http: RunningHttpServer;

const mockPassword = randomBytes(16).toString('hex');

function buildConnectArgs(): Record<string, unknown> {
  return {
    baseUrl: `http://127.0.0.1:${mockPort}`,
    username: 'DEVELOPER',
    password: mockPassword,
    client: '100',
  };
}

function parseToolText(result: unknown): { json: unknown; isError: boolean } {
  const r = result as {
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  const text = r.content?.[0]?.text ?? '';
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  return { json, isError: Boolean(r.isError) };
}

describe('adt-mcp HTTP — Wave 3 changesets', () => {
  before(async () => {
    mockAdt = createMockAdtServer();
    const info = await mockAdt.start();
    mockPort = info.port;

    const registry = createSessionRegistry({ ttlMs: 0 });

    http = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      registry,
      multiSystem: { systems: {}, resolve: () => undefined },
      log: () => undefined,
    });
  });

  after(async () => {
    await http?.close();
    await mockAdt?.stop();
  });

  async function openClient(): Promise<{
    client: Client;
    transport: StreamableHTTPClientTransport;
  }> {
    const transport = new StreamableHTTPClientTransport(new URL(http.url));
    const client = new Client({ name: 'http-changeset-it', version: '0.0.1' });
    await client.connect(transport);
    // sap_connect with explicit credentials so the session has a client.
    const connectRes = await client.callTool({
      name: 'sap_connect',
      arguments: buildConnectArgs(),
    });
    const { isError, json } = parseToolText(connectRes);
    assert.strictEqual(
      isError,
      false,
      `sap_connect failed: ${JSON.stringify(json)}`,
    );
    return { client, transport };
  }

  it('full cycle: begin → add x2 → commit activates once', async () => {
    const { client, transport } = await openClient();
    try {
      const beginRes = await client.callTool({
        name: 'changeset_begin',
        arguments: { description: 'http-it-commit' },
      });
      const begin = parseToolText(beginRes) as {
        json: { ok: boolean; changeset: { id: string; status: string } };
        isError: boolean;
      };
      assert.strictEqual(begin.isError, false, JSON.stringify(begin.json));
      assert.strictEqual(begin.json.changeset.status, 'open');

      const add1 = parseToolText(
        await client.callTool({
          name: 'changeset_add',
          arguments: {
            objectType: 'CLAS',
            objectName: `ZCL_HTTP_${randomBytes(2).toString('hex')}`,
            source:
              'CLASS x DEFINITION. ENDCLASS. CLASS x IMPLEMENTATION. ENDCLASS.',
          },
        }),
      );
      assert.strictEqual(add1.isError, false, JSON.stringify(add1.json));

      const add2 = parseToolText(
        await client.callTool({
          name: 'changeset_add',
          arguments: {
            objectType: 'PROG',
            objectName: `ZP_HTTP_${randomBytes(2).toString('hex')}`,
            source: 'REPORT zp.',
          },
        }),
      );
      assert.strictEqual(add2.isError, false, JSON.stringify(add2.json));

      const commitRes = parseToolText(
        await client.callTool({
          name: 'changeset_commit',
          arguments: {},
        }),
      );
      const commit = commitRes.json as {
        ok: boolean;
        changeset: {
          status: string;
          activated: string[];
          failed: unknown[];
          entryCount: number;
        };
      };
      assert.strictEqual(commitRes.isError, false, JSON.stringify(commit));
      assert.strictEqual(commit.changeset.status, 'committed');
      assert.strictEqual(commit.changeset.activated.length, 2);
      assert.strictEqual(commit.changeset.failed.length, 0);
    } finally {
      await transport.close();
    }
  });

  it('rollback in a second session releases locks without activating', async () => {
    const { client, transport } = await openClient();
    try {
      await client.callTool({
        name: 'changeset_begin',
        arguments: {},
      });
      const addRes = parseToolText(
        await client.callTool({
          name: 'changeset_add',
          arguments: {
            objectType: 'INTF',
            objectName: `ZIF_HTTP_${randomBytes(2).toString('hex')}`,
            source: 'INTERFACE zif PUBLIC. ENDINTERFACE.',
          },
        }),
      );
      assert.strictEqual(addRes.isError, false, JSON.stringify(addRes.json));
      const addJson = addRes.json as { entry: { lockHandle: string } };
      assert.ok(addJson.entry.lockHandle);

      const rbRes = parseToolText(
        await client.callTool({
          name: 'changeset_rollback',
          arguments: {},
        }),
      );
      const rb = rbRes.json as {
        changeset: { released: string[]; failed: unknown[]; status: string };
      };
      assert.strictEqual(rbRes.isError, false, JSON.stringify(rb));
      assert.strictEqual(rb.changeset.status, 'rolled_back');
      assert.strictEqual(rb.changeset.released.length, 1);
    } finally {
      await transport.close();
    }
  });

  it('changeset_begin is rejected while another changeset is open (unless force=true)', async () => {
    const { client, transport } = await openClient();
    try {
      await client.callTool({
        name: 'changeset_begin',
        arguments: {},
      });

      const second = parseToolText(
        await client.callTool({
          name: 'changeset_begin',
          arguments: {},
        }),
      );
      assert.strictEqual(second.isError, true);

      const forced = parseToolText(
        await client.callTool({
          name: 'changeset_begin',
          arguments: { force: true },
        }),
      );
      assert.strictEqual(forced.isError, false, JSON.stringify(forced.json));

      await client.callTool({
        name: 'changeset_rollback',
        arguments: {},
      });
    } finally {
      await transport.close();
    }
  });
});
