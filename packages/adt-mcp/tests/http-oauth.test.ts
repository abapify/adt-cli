/**
 * OAuth 2.1 / OIDC bearer-token validation tests for adt-mcp.
 *
 * We stand up:
 *   - An ephemeral RSA keypair (via jose `generateKeyPair`).
 *   - A minimal in-process HTTP server exposing:
 *       · `/.well-known/openid-configuration` → points at our JWKS.
 *       · `/jwks.json`                        → the public key as a JWKS.
 *   - Sign test JWTs with the private key under several claim permutations.
 *
 * Then we start `startHttpServer` with `authMode='oauth'`, probe `/mcp`
 * with various bearer tokens, and assert 401/400 outcomes. We also use
 * the `onOAuthUserHint` internal hook to verify the claim-extraction
 * logic end-to-end.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import {
  generateKeyPair,
  SignJWT,
  exportJWK,
  type JWK,
  type KeyLike,
} from 'jose';
import { startHttpServer } from '../src/lib/http/server.js';
import type { RunningHttpServer } from '../src/lib/http/server.js';
import { createSessionRegistry } from '../src/lib/session/registry.js';
import type { UserHint } from '../src/lib/http/auth.js';
import { __resetOAuthDiscoveryCacheForTests } from '../src/lib/http/oauth.js';

const noopLog = () => {
  /* keep test output clean */
};

function emptyRegistry() {
  return createSessionRegistry({ ttlMs: 0 });
}

interface MockIdp {
  issuer: string;
  jwksUri: string;
  discoveryUri: string;
  privateKey: KeyLike;
  publicJwk: JWK;
  kid: string;
  server: http.Server;
  close(): Promise<void>;
}

async function startMockIdp(): Promise<MockIdp> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  publicJwk.kid = 'test-key-1';
  const kid = publicJwk.kid;

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    if (url === '/.well-known/openid-configuration') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          issuer: base,
          jwks_uri: `${base}/jwks.json`,
        }),
      );
      return;
    }
    if (url === '/jwks.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  return {
    issuer: base,
    jwksUri: `${base}/jwks.json`,
    discoveryUri: `${base}/.well-known/openid-configuration`,
    privateKey,
    publicJwk,
    kid,
    server,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

interface SignOptions {
  issuer?: string;
  audience?: string | string[];
  subject?: string;
  expiresIn?: string;
  notBefore?: string;
  scope?: string;
  scp?: string | string[];
  preferredUsername?: string;
  email?: string;
  groups?: string[];
  extra?: Record<string, unknown>;
}

async function sign(idp: MockIdp, opts: SignOptions = {}): Promise<string> {
  const payload: Record<string, unknown> = { ...(opts.extra ?? {}) };
  if (opts.scope !== undefined) payload.scope = opts.scope;
  if (opts.scp !== undefined) payload.scp = opts.scp;
  if (opts.preferredUsername !== undefined)
    payload.preferred_username = opts.preferredUsername;
  if (opts.email !== undefined) payload.email = opts.email;
  if (opts.groups !== undefined) payload.groups = opts.groups;

  let jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: idp.kid })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? idp.issuer)
    .setSubject(opts.subject ?? 'user-123');
  if (opts.audience) jwt = jwt.setAudience(opts.audience);
  if (opts.expiresIn) jwt = jwt.setExpirationTime(opts.expiresIn);
  else jwt = jwt.setExpirationTime('10m');
  if (opts.notBefore) jwt = jwt.setNotBefore(opts.notBefore);
  return await jwt.sign(idp.privateKey);
}

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

describe('adt-mcp HTTP auth — mode=oauth (JWKS explicit)', () => {
  let idp: MockIdp;
  let server: RunningHttpServer;
  const capturedHints: (UserHint | undefined)[] = [];

  before(async () => {
    __resetOAuthDiscoveryCacheForTests();
    idp = await startMockIdp();
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      authMode: 'oauth',
      oauth: {
        issuer: idp.issuer,
        audience: 'adt-mcp-api',
        jwksUri: idp.jwksUri,
        requiredScopes: ['adt:read'],
        clockTolerance: 2,
      },
      onOAuthUserHint: (h) => capturedHints.push(h),
      registry: emptyRegistry(),
      multiSystem: { systems: {}, resolve: () => undefined },
      log: noopLog,
    });
  });
  after(async () => {
    await server.close();
    await idp.close();
  });

  it('401 when Authorization header is missing', async () => {
    const res = await probeMcp(server);
    assert.strictEqual(res.status, 401);
    const wwwAuth = res.headers.get('www-authenticate') ?? '';
    assert.ok(
      wwwAuth.toLowerCase().startsWith('bearer'),
      `WWW-Authenticate must start with Bearer, got: ${wwwAuth}`,
    );
    assert.ok(
      wwwAuth.includes('error='),
      'WWW-Authenticate must include an error parameter for RFC 6750',
    );
  });

  it('401 for a token signed by a different (wrong) issuer', async () => {
    const token = await sign(idp, {
      issuer: 'https://not-our-issuer.example.com',
      audience: 'adt-mcp-api',
      scope: 'adt:read',
    });
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.status, 401);
  });

  it('401 for a token with wrong audience', async () => {
    const token = await sign(idp, {
      audience: 'some-other-api',
      scope: 'adt:read',
    });
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.status, 401);
  });

  it('401 for an expired token', async () => {
    const token = await sign(idp, {
      audience: 'adt-mcp-api',
      expiresIn: '-1m',
      scope: 'adt:read',
    });
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.status, 401);
  });

  it('401 for a valid token missing the required scope', async () => {
    const token = await sign(idp, {
      audience: 'adt-mcp-api',
      scope: 'some:other:scope',
    });
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.status, 401);
    const body = (await res.json()) as { error?: string };
    assert.ok(
      body.error && body.error.startsWith('insufficient_scope'),
      `expected insufficient_scope error, got ${JSON.stringify(body)}`,
    );
  });

  it('passes auth with a valid token containing the required scope (routing returns 400, not 401)', async () => {
    const token = await sign(idp, {
      audience: 'adt-mcp-api',
      scope: 'adt:read adt:write',
      preferredUsername: 'alice@example.com',
      email: 'alice@example.com',
      groups: ['devs', 'admins'],
    });
    const before = capturedHints.length;
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.notStrictEqual(res.status, 401);
    assert.ok(
      res.status === 400 || res.status === 404,
      `expected 400 routing failure after successful auth, got ${res.status}`,
    );
    const hint = capturedHints[before];
    assert.ok(hint, 'userHint hook should have been called');
    assert.strictEqual(hint.user, 'alice@example.com');
    assert.strictEqual(hint.email, 'alice@example.com');
    assert.deepStrictEqual(hint.groups, ['devs', 'admins']);
  });

  it('accepts `scp` claim (Microsoft Entra ID flavour)', async () => {
    const token = await sign(idp, {
      audience: 'adt-mcp-api',
      scp: 'adt:read',
      subject: 'entra-user-1',
    });
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.notStrictEqual(res.status, 401);
  });

  it('/healthz still works without auth', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/healthz`);
    assert.strictEqual(res.status, 200);
  });
});

describe('adt-mcp HTTP auth — mode=oauth (OIDC discovery fallback)', () => {
  let idp: MockIdp;
  let server: RunningHttpServer;

  before(async () => {
    __resetOAuthDiscoveryCacheForTests();
    idp = await startMockIdp();
    // No jwksUri → force discovery.
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      authMode: 'oauth',
      oauth: {
        issuer: idp.issuer,
        audience: 'adt-mcp-api',
      },
      registry: emptyRegistry(),
      multiSystem: { systems: {}, resolve: () => undefined },
      log: noopLog,
    });
  });
  after(async () => {
    await server.close();
    await idp.close();
  });

  it('resolves JWKS via /.well-known/openid-configuration and accepts a valid token', async () => {
    const token = await sign(idp, { audience: 'adt-mcp-api' });
    const res = await probeMcp(server, { Authorization: `Bearer ${token}` });
    assert.notStrictEqual(res.status, 401);
    assert.ok(
      res.status === 400 || res.status === 404,
      `expected 400, got ${res.status}`,
    );
  });
});

describe('adt-mcp HTTP auth — mode=oauth config errors', () => {
  it('startHttpServer throws when authMode=oauth without oauth options', async () => {
    await assert.rejects(
      async () =>
        await startHttpServer({
          port: 0,
          host: '127.0.0.1',
          authMode: 'oauth',
          registry: emptyRegistry(),
          multiSystem: { systems: {}, resolve: () => undefined },
          log: noopLog,
        }),
      /authMode=oauth requires `oauth` options/u,
    );
  });
});
