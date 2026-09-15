/**
 * Integration tests for ADT invocation authentication on the MCP HTTP
 * transport. These prove that only verified claims become session identity
 * and scope, and that a session cannot be continued with another JTI.
 */
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
import { generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { createMcpInvocationVerifier } from '../src/lib/http/invocation.js';
import {
  createHttpMcpHandler,
  type HttpServerOptions,
  type RunningHttpServer,
} from '../src/lib/http/server.js';
import { createDestinationContextRegistry } from '../src/lib/session/destination-registry.js';

const issuer = 'adt-api';
const audience = 'adt-server-mcp';
const keyId = 'adt-mcp-integration-test';

async function signInvocation(
  privateKey: CryptoKey,
  overrides: {
    tokenId?: string;
    classes?: string[];
    destinationKeys?: string[];
    agentId?: 'ai-review' | 'system-assistant';
    constraint?: Record<string, unknown>;
    limits?: Record<string, unknown>;
  } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1_000);
  return await new SignJWT({
    v: 1,
    kid: keyId,
    principal: 'petr.plenkov',
    agentId: overrides.agentId ?? 'system-assistant',
    classes: overrides.classes ?? ['server', 'read'],
    destinationKeys: overrides.destinationKeys ?? ['dev'],
    correlationId: 'correlation-http-invocation',
    constraint:
      overrides.constraint ??
      (overrides.agentId === 'ai-review'
        ? {
            reviewId: 'review-1',
            runId: 'run-1',
            frozenCanonicalKeys: ['CLAS:ZCL_SCOPE_TEST'],
          }
        : { systemSid: 'DEV' }),
    limits: overrides.limits ?? {},
  })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 60)
    .setJti(overrides.tokenId ?? 'invocation-jti-1')
    .sign(privateKey);
}

async function startInvocationServer(
  publicKey: CryptoKey,
  destinationServer: HttpServerOptions['destinationServer'],
): Promise<RunningHttpServer> {
  return startTestServer({
    authMode: 'invocation',
    invocationVerifier: createMcpInvocationVerifier({
      publicKey,
      keyId,
      issuer,
      audience,
    }),
    destinationServer,
  });
}

test('ADT invocation auth snapshots verified read scope and binds continuation to its JTI', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const { registry: destinationRegistry, stats } = testDestinationRegistry();
  const server = await startInvocationServer(publicKey, {
    destinationRegistry,
    requestIdentity: () => ({
      principal: 'untrusted-callback-principal',
      agentId: 'untrusted-callback-agent',
    }),
    requestAccess: () => ({
      classes: ['write'],
      destinationKeys: ['prod'],
    }),
  });
  const credential = await signInvocation(privateKey);
  const transport = createTlsTransport(server.url, {
    requestInit: { headers: { Authorization: `Bearer ${credential}` } },
  });
  const client = new Client({ name: 'invocation-auth-test', version: '0.0.1' });

  try {
    await client.connect(transport);
    assert.ok(transport.sessionId);

    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'system_info'));
    assert.ok(!tools.tools.some((tool) => tool.name === 'lock_object'));

    const denied = await client.callTool({
      name: 'lock_object',
      arguments: { destination: 'dev', objectName: 'ZCL_SCOPE_TEST' },
    });
    assertScopeDenied(denied);
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);

    const replacementCredential = await signInvocation(privateKey, {
      tokenId: 'invocation-jti-2',
    });
    const replacementResponse = await tlsFetch(server.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${replacementCredential}`,
        'Content-Type': 'application/json',
        'Mcp-Session-Id': transport.sessionId,
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
    assert.strictEqual(replacementResponse.status, 403);
    assert.deepStrictEqual(await replacementResponse.json(), {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'mcp_session_identity_mismatch' },
      id: null,
    });
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);
  } finally {
    await transport.close();
    await server.close();
    await destinationRegistry.shutdown();
  }
});

test('ADT invocation auth fails closed for an AI Review policy the sidecar cannot yet enforce', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const { registry: destinationRegistry, stats } = testDestinationRegistry();
  const server = await startInvocationServer(publicKey, {
    destinationRegistry,
    requestIdentity: () => ({ principal: 'untrusted-callback-principal' }),
    requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
  });
  const credential = await signInvocation(privateKey, { agentId: 'ai-review' });
  const transport = createTlsTransport(server.url, {
    requestInit: { headers: { Authorization: `Bearer ${credential}` } },
  });
  const client = new Client({
    name: 'ai-review-policy-test',
    version: '0.0.1',
  });

  try {
    await client.connect(transport);
    assert.deepStrictEqual((await client.listTools()).tools, []);

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
    await destinationRegistry.shutdown();
  }
});

test('AI Review exposes only its signed frozen-source tool', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const destinationRegistry = createDestinationContextRegistry({
    leaseProvider: {
      async acquire() {
        throw new Error('tool listing must not acquire a destination lease');
      },
    },
    contextFactory: {
      async create() {
        throw new Error('tool listing must not create a destination context');
      },
    },
  });
  const server = await startInvocationServer(publicKey, {
    destinationRegistry,
    requestIdentity: () => ({ principal: 'untrusted-callback-principal' }),
    requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
  });
  const credential = await signInvocation(privateKey, {
    agentId: 'ai-review',
    constraint: {
      kind: 'ai-review-frozen-v1',
      reviewId: '11111111-1111-4111-8111-111111111111',
      runId: '22222222-2222-4222-8222-222222222222',
      systemSid: 'DEV',
      frozenSources: [
        {
          canonicalKey: 'CLAS:ZCL_SCOPE_TEST',
          componentId: 'main',
          sourceRef: 'v1.opaque-reference',
        },
      ],
    },
    limits: { maxSourceBytes: 65_536 },
  });
  const transport = createTlsTransport(server.url, {
    requestInit: { headers: { Authorization: `Bearer ${credential}` } },
  });
  const client = new Client({
    name: 'ai-review-frozen-policy-test',
    version: '0.0.1',
  });

  try {
    await client.connect(transport);
    assert.deepStrictEqual(
      (await client.listTools()).tools.map((tool) => tool.name),
      ['get_frozen_source'],
    );
  } finally {
    await transport.close();
    await server.close();
    await destinationRegistry.shutdown();
  }
});

test('AI Review redeems only the signed source component before acquiring its destination', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  let boundedSourceReads = 0;
  const resolverCalls: Array<{
    destination: string;
    systemSid: string;
    sourceRef: string;
  }> = [];
  const { registry: destinationRegistry, stats } = testDestinationRegistry(
    async () =>
      ({
        async readTextBounded(uri: string, maxBytes: number) {
          boundedSourceReads++;
          assert.strictEqual(
            uri,
            '/sap/bc/adt/oo/classes/zcl_scope_test/source/main',
          );
          assert.strictEqual(maxBytes, 65_536);
          return 'CLASS zcl_scope_test DEFINITION PUBLIC.';
        },
      }) as never,
  );
  const server = await startInvocationServer(publicKey, {
    destinationRegistry,
    requestIdentity: () => ({ principal: 'untrusted-callback-principal' }),
    requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
    async resolveFrozenSource(input) {
      resolverCalls.push(input);
      return {
        sourceUri: '/sap/bc/adt/oo/classes/zcl_scope_test/source/main',
      };
    },
  });
  const credential = await signInvocation(privateKey, {
    agentId: 'ai-review',
    constraint: {
      kind: 'ai-review-frozen-v1',
      reviewId: '11111111-1111-4111-8111-111111111111',
      runId: '22222222-2222-4222-8222-222222222222',
      systemSid: 'DEV',
      frozenSources: [
        {
          canonicalKey: 'CLAS:ZCL_SCOPE_TEST',
          componentId: 'main',
          sourceRef: 'v1.opaque-reference',
        },
      ],
    },
    limits: { maxSourceBytes: 65_536 },
  });
  const transport = createTlsTransport(server.url, {
    requestInit: { headers: { Authorization: `Bearer ${credential}` } },
  });
  const client = new Client({
    name: 'ai-review-source-test',
    version: '0.0.1',
  });

  try {
    await client.connect(transport);
    const denied = await client.callTool({
      name: 'get_frozen_source',
      arguments: {
        destination: 'dev',
        canonicalKey: 'CLAS:ZCL_SCOPE_TEST',
        componentId: 'inactive',
      },
    });
    assertScopeDenied(denied);
    assert.strictEqual(stats.leases, 0);
    assert.strictEqual(stats.contexts, 0);
    assert.deepStrictEqual(resolverCalls, []);

    const accepted = await client.callTool({
      name: 'get_frozen_source',
      arguments: {
        destination: 'dev',
        canonicalKey: 'CLAS:ZCL_SCOPE_TEST',
        componentId: 'main',
      },
    });
    assert.strictEqual(accepted.isError, undefined);
    assert.deepStrictEqual(resolverCalls, [
      {
        destination: 'dev',
        systemSid: 'DEV',
        sourceRef: 'v1.opaque-reference',
      },
    ]);
    assert.strictEqual(stats.leases, 1);
    assert.strictEqual(stats.contexts, 1);
    assert.strictEqual(boundedSourceReads, 1);
    assert.deepStrictEqual(
      JSON.parse(
        (accepted.content as Array<{ type: 'text'; text: string }>)[0]?.text ??
          '',
      ),
      {
        canonicalKey: 'CLAS:ZCL_SCOPE_TEST',
        componentId: 'main',
        bytes: 39,
        source: 'CLASS zcl_scope_test DEFINITION PUBLIC.',
      },
    );
  } finally {
    await transport.close();
    await server.close();
    await destinationRegistry.shutdown();
  }
});

test('ADT invocation auth rejects credentials that request write authority', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const destinationRegistry = createDestinationContextRegistry({
    leaseProvider: {
      async acquire() {
        throw new Error('must not acquire for rejected credential');
      },
    },
    contextFactory: {
      async create() {
        throw new Error('must not create for rejected credential');
      },
    },
  });
  const server = await startInvocationServer(publicKey, {
    destinationRegistry,
    requestIdentity: () => ({ principal: 'must-not-run' }),
    requestAccess: () => ({ classes: ['read'], destinationKeys: ['dev'] }),
  });

  try {
    const credential = await signInvocation(privateKey, {
      classes: ['read', 'write'],
    });
    const response = await tlsFetch(server.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${credential}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    assert.strictEqual(response.status, 401);
  } finally {
    await server.close();
    await destinationRegistry.shutdown();
  }
});

test('ADT invocation mode requires a verifier and destination scope source', () => {
  assert.throws(
    () =>
      createHttpMcpHandler({
        authMode: 'invocation',
      }),
    /invocation.*verifier/u,
  );
  assert.throws(
    () =>
      createHttpMcpHandler({
        authMode: 'invocation',
        invocationVerifier: {
          async verify() {
            return undefined;
          },
        },
      }),
    /invocation.*destinationServer/u,
  );
});
