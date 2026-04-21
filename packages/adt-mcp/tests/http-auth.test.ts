/**
 * HTTP-auth + CORS unit tests for adt-mcp.
 *
 * These tests exercise `startHttpServer` directly with raw `fetch`
 * requests — no MCP client round-trip required. We validate 401/200
 * outcomes under each auth mode, userHint propagation in proxy mode,
 * and CORS preflight / allow-list behaviour.
 *
 * `/healthz` is used as the always-on endpoint: it sits after
 * host-validation + CORS but before auth, so we can probe auth outcomes
 * without needing a real MCP session.
 *
 * NOTE on `/healthz`: per the implementation it is exposed BEFORE auth
 * precisely so monitoring probes work. For auth-path tests we therefore
 * probe `/mcp` with a non-initialize POST — the server returns 400 for
 * an allowed (authenticated) call, and 401 for an unauthenticated one.
 * That's enough to distinguish "auth passed" from "auth blocked".
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startHttpServer } from '../src/lib/http/server.js';
import { createSessionRegistry } from '../src/lib/session/registry.js';
import type { RunningHttpServer } from '../src/lib/http/server.js';

const noopLog = () => {
  /* keep test output clean */
};

function emptyRegistry() {
  return createSessionRegistry({ ttlMs: 0 });
}

/**
 * POST /mcp with an unknown session id — the server will reject with 400
 * once auth passes (no body required beyond this). 401 means auth
 * blocked the request before routing.
 */
async function probeMcp(
  server: RunningHttpServer,
  headers: Record<string, string> = {},
): Promise<Response> {
  return await fetch(`http://127.0.0.1:${server.port}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Mcp-Session-Id': 'deadbeef-not-a-real-session',
      ...headers,
    },
    body: '{}',
  });
}

describe('adt-mcp HTTP auth — mode=none (default)', () => {
  let server: RunningHttpServer;
  before(async () => {
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      registry: emptyRegistry(),
      multiSystem: { systems: {}, resolve: () => undefined },
      log: noopLog,
    });
  });
  after(async () => {
    await server.close();
  });

  it('allows unauthenticated requests to /mcp (auth=none → 400 for bad session, not 401)', async () => {
    const res = await probeMcp(server);
    assert.notStrictEqual(res.status, 401, 'auth=none should never return 401');
    assert.ok(
      res.status === 400 || res.status === 404,
      `expected 400/404 routing error, got ${res.status}`,
    );
  });

  it('allows unauthenticated /healthz', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/healthz`);
    assert.strictEqual(res.status, 200);
  });
});

describe('adt-mcp HTTP auth — mode=bearer', () => {
  let server: RunningHttpServer;
  const token = 'super-secret-test-token-abc123';
  before(async () => {
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      authMode: 'bearer',
      authToken: token,
      registry: emptyRegistry(),
      multiSystem: { systems: {}, resolve: () => undefined },
      log: noopLog,
    });
  });
  after(async () => {
    await server.close();
  });

  it('401 when Authorization header is missing', async () => {
    const res = await probeMcp(server);
    assert.strictEqual(res.status, 401);
    const body = (await res.json()) as { error?: string };
    assert.strictEqual(body.error, 'unauthorized');
  });

  it('401 on wrong bearer token', async () => {
    const res = await probeMcp(server, { Authorization: 'Bearer wrong' });
    assert.strictEqual(res.status, 401);
  });

  it('401 on wrong bearer token with matching length', async () => {
    // Ensure constant-time compare still rejects equal-length mismatches.
    const wrongSameLen = 'x'.repeat(token.length);
    const res = await probeMcp(server, {
      Authorization: `Bearer ${wrongSameLen}`,
    });
    assert.strictEqual(res.status, 401);
  });

  it('passes auth with correct bearer (routing returns 400, not 401)', async () => {
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.notStrictEqual(res.status, 401);
    assert.ok(
      res.status === 400 || res.status === 404,
      `expected 400 (auth ok), got ${res.status}`,
    );
  });

  it('still allows /healthz without auth (monitoring probes)', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/healthz`);
    assert.strictEqual(res.status, 200);
  });

  it('throws at startup when bearer mode has no token', async () => {
    await assert.rejects(
      async () =>
        await startHttpServer({
          port: 0,
          host: '127.0.0.1',
          authMode: 'bearer',
          registry: emptyRegistry(),
          multiSystem: { systems: {}, resolve: () => undefined },
          log: noopLog,
        }),
      /bearer mode requires a non-empty token/u,
    );
  });
});

describe('adt-mcp HTTP auth — mode=proxy (trustForwardedAuth)', () => {
  let server: RunningHttpServer;
  before(async () => {
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      trustForwardedAuth: true,
      registry: emptyRegistry(),
      multiSystem: { systems: {}, resolve: () => undefined },
      log: noopLog,
    });
  });
  after(async () => {
    await server.close();
  });

  it('401 when x-forwarded-user is missing', async () => {
    const res = await probeMcp(server);
    assert.strictEqual(res.status, 401);
  });

  it('allows the request when x-forwarded-user is present', async () => {
    const res = await probeMcp(server, {
      'X-Forwarded-User': 'alice',
      'X-Forwarded-Email': 'alice@example.com',
      'X-Forwarded-Groups': 'devs, admins',
    });
    assert.notStrictEqual(res.status, 401);
  });
});

describe('adt-mcp HTTP — CORS', () => {
  let server: RunningHttpServer;
  before(async () => {
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      allowedOrigins: ['https://app.example.com'],
      registry: emptyRegistry(),
      multiSystem: { systems: {}, resolve: () => undefined },
      log: noopLog,
    });
  });
  after(async () => {
    await server.close();
  });

  it('preflight OPTIONS for allowed origin returns 204 with CORS headers', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/mcp`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, mcp-session-id',
      },
    });
    assert.strictEqual(res.status, 204);
    assert.strictEqual(
      res.headers.get('access-control-allow-origin'),
      'https://app.example.com',
    );
    const methods = res.headers.get('access-control-allow-methods') ?? '';
    assert.ok(methods.includes('POST'), 'allow-methods should include POST');
    assert.ok(
      methods.includes('DELETE'),
      'allow-methods should include DELETE',
    );
    const allowedHeaders =
      res.headers.get('access-control-allow-headers') ?? '';
    assert.ok(
      allowedHeaders.includes('mcp-session-id'),
      'allow-headers must include mcp-session-id',
    );
    assert.ok(
      allowedHeaders.includes('authorization'),
      'allow-headers must include authorization',
    );
    assert.strictEqual(
      res.headers.get('access-control-expose-headers'),
      'mcp-session-id',
    );
  });

  it('preflight from disallowed origin returns 403', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/mcp`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.strictEqual(res.status, 403);
  });

  it('regular request from allowed origin has CORS response headers', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/healthz`, {
      headers: { Origin: 'https://app.example.com' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers.get('access-control-allow-origin'),
      'https://app.example.com',
    );
    assert.strictEqual(
      res.headers.get('access-control-expose-headers'),
      'mcp-session-id',
    );
  });
});
