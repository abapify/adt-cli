import assert from 'node:assert/strict';
import test from 'node:test';
import {
  tlsFetch,
  createTlsTransport,
  startTestServer,
  testDestinationRegistry,
  assertScopeDenied,
} from './_tls-fixtures.js';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';

test('HTTP destination mode projects only read-scoped tools without weakening hidden write dispatch', async () => {
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: () => ({ principal: 'http-list-scope-test' }),
      requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
    },
  });
  const transport = createTlsTransport(server.url);
  const client = new Client({ name: 'http-list-scope-test', version: '0.0.1' });
  await client.connect(transport);

  try {
    const tools = await client.listTools();
    const names = new Set(tools.tools.map((tool) => tool.name));
    const gctsConfig = tools.tools.find((tool) => tool.name === 'gcts_config');
    const gctsActionSchema = gctsConfig?.inputSchema.properties?.action as
      { enum?: unknown[] } | undefined;

    assert.ok(names.has('system_info'));
    assert.ok(names.has('gcts_config'));
    assert.ok(!names.has('atc_run'));
    assert.ok(!names.has('run_unit_tests'));
    assert.ok(!names.has('lock_object'));
    assert.ok(!names.has('activate_object'));
    assert.deepStrictEqual(gctsActionSchema?.enum, ['get', 'list']);

    const denied = await client.callTool({
      name: 'lock_object',
      arguments: { destination: 'dev', objectName: 'ZCL_SCOPE_TEST' },
    });
    assertScopeDenied(denied);
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);

    const deniedGctsWrite = await client.callTool({
      name: 'gcts_config',
      arguments: {
        destination: 'dev',
        rid: 'SCOPE_TEST',
        action: 'set',
        key: 'scope-test',
        value: 'blocked',
      },
    });
    assert.strictEqual(deniedGctsWrite.isError, true);
    assert.strictEqual(
      (deniedGctsWrite.content as Array<{ type: 'text'; text: string }>)[0]
        ?.text,
      'mcp_scope_denied',
    );
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);

    const allowedGctsRead = await client.callTool({
      name: 'gcts_config',
      arguments: {
        destination: 'dev',
        rid: 'SCOPE_TEST',
        action: 'list',
      },
    });
    assert.notStrictEqual(
      (allowedGctsRead.content as Array<{ type: 'text'; text: string }>)[0]
        ?.text,
      'mcp_scope_denied',
    );
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});

test('HTTP destination mode snapshots trusted access against provider mutation', async () => {
  const access: {
    classes: Array<'read' | 'write'>;
    destinationKeys: string[];
  } = {
    classes: ['read'],
    destinationKeys: ['dev'],
  };
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: () => ({ principal: 'http-access-snapshot-test' }),
      requestAccess: () => access,
    },
  });
  const transport = createTlsTransport(server.url);
  const client = new Client({
    name: 'http-access-snapshot-test',
    version: '0.0.1',
  });
  await client.connect(transport);
  access.classes.push('write');
  access.destinationKeys.push('prod');

  try {
    const tools = await client.listTools();
    const names = new Set(tools.tools.map((tool) => tool.name));
    assert.ok(names.has('system_info'));
    assert.ok(!names.has('lock_object'));
    assert.ok(!names.has('activate_object'));

    for (const call of [
      {
        name: 'system_info',
        arguments: { destination: 'prod' },
      },
      {
        name: 'lock_object',
        arguments: { destination: 'prod', objectName: 'ZCL_SCOPE_TEST' },
      },
    ]) {
      const denied = await client.callTool(call);
      assertScopeDenied(denied);
    }
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);

    const allowed = await client.callTool({
      name: 'gcts_config',
      arguments: {
        destination: 'dev',
        rid: 'SCOPE_TEST',
        action: 'list',
      },
    });
    assert.notStrictEqual(
      (allowed.content as Array<{ type: 'text'; text: string }>)[0]?.text,
      'mcp_scope_denied',
    );
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});

test('HTTP destination mode treats malformed trusted access as no access', async () => {
  const access = JSON.parse('{"classes":"read","destinationKeys":["dev"]}');
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: () => ({ principal: 'http-malformed-access-test' }),
      requestAccess: () => access,
    },
  });
  const transport = createTlsTransport(server.url);
  const client = new Client({
    name: 'http-malformed-access-test',
    version: '0.0.1',
  });
  await client.connect(transport);

  try {
    const tools = await client.listTools();
    assert.deepStrictEqual(tools.tools, []);

    const denied = await client.callTool({
      name: 'system_info',
      arguments: { destination: 'dev' },
    });
    assertScopeDenied(denied);
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});

test('HTTP destination mode lists no operational tools without an authorised destination', async () => {
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: () => ({ principal: 'http-empty-destination-test' }),
      requestAccess: () => ({ classes: ['read'], destinationKeys: [] }),
    },
  });
  const transport = createTlsTransport(server.url);
  const client = new Client({
    name: 'http-empty-destination-test',
    version: '0.0.1',
  });
  await client.connect(transport);

  try {
    const tools = await client.listTools();
    assert.deepStrictEqual(tools.tools, []);

    const denied = await client.callTool({
      name: 'system_info',
      arguments: { destination: 'dev' },
    });
    assertScopeDenied(denied);
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});

test('HTTP destination mode fails closed when trusted access is absent', async () => {
  // eslint-disable-next-line prefer-const
  let access:
    { classes: Array<'read'>; destinationKeys: Array<string> } | undefined;
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: () => ({ principal: 'http-scope-test' }),
      requestAccess: () => access,
    },
  });
  const transport = createTlsTransport(server.url);
  const client = new Client({ name: 'http-scope-test', version: '0.0.1' });
  await client.connect(transport);
  // The value resolved at initialization is intentionally retained. A later
  // mutable value (or later request) cannot expand an active session's scope.
  access = { classes: ['read'], destinationKeys: ['dev'] };

  try {
    for (const call of [
      { name: 'system_info', arguments: { destination: 'dev' } },
      {
        name: 'lock_object',
        arguments: { destination: 'dev', objectName: 'ZCL_SCOPE_TEST' },
      },
    ]) {
      const result = await client.callTool(call);
      assertScopeDenied(result);
    }
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});

test('HTTP destination mode rejects a session when trusted identity derivation later fails', async () => {
  let identityAvailable = true;
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: () => {
        if (identityAvailable) return { principal: 'http-identity-test' };
        throw new Error('identity provider unavailable');
      },
      requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
    },
  });
  const transport = createTlsTransport(server.url);
  const client = new Client({ name: 'http-identity-test', version: '0.0.1' });
  await client.connect(transport);
  identityAvailable = false;

  try {
    await assert.rejects(
      async () =>
        await client.callTool({
          name: 'system_info',
          arguments: { destination: 'dev' },
        }),
      /mcp_session_identity_mismatch/u,
    );
    assert.strictEqual(stats.leases, 0);
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});

test('HTTP destination mode rejects a session used by another authenticated principal', async () => {
  const { registry: destinations, stats } = testDestinationRegistry();
  const server = await startTestServer({
    trustForwardedAuth: true,
    destinationServer: {
      destinationRegistry: destinations,
      requestIdentity: ({ userHint }) => {
        if (!userHint) throw new Error('missing trusted user');
        return { principal: userHint.user, agentId: 'system-assistant' };
      },
      requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
    },
  });
  const transport = createTlsTransport(server.url, {
    requestInit: { headers: { 'X-Forwarded-User': 'alice' } },
  });
  const client = new Client({ name: 'http-session-test', version: '0.0.1' });
  await client.connect(transport);
  assert.ok(transport.sessionId);

  try {
    const response = await tlsFetch(server.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'Mcp-Session-Id': transport.sessionId,
        'X-Forwarded-User': 'bob',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'system_info',
          arguments: { destination: 'dev' },
        },
      }),
    });

    assert.strictEqual(response.status, 403);
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    assert.strictEqual(body.error?.message, 'mcp_session_identity_mismatch');
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);
  } finally {
    await transport.close();
    await server.close();
    await destinations.shutdown();
  }
});
