import assert from 'node:assert/strict';
import {
  startHttpServer,
  type HttpServerOptions,
  type RunningHttpServer,
} from '../src/lib/http/server.js';
import {
  createDestinationContextRegistry,
  type DestinationContextRegistry,
} from '../src/lib/session/destination-registry.js';
import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  getTestTlsMaterial as loadTestTlsMaterial,
  trustTestCa,
  type TestTlsMaterial,
} from '@abapify/adt-fixtures';

export type { TestTlsMaterial };

/** `tlsCertContent`/`tlsKeyContent` pair for `startHttpServer` options. */
export function testTlsOptions(): {
  tlsCertContent: string;
  tlsKeyContent: string;
} {
  const material = getTestTlsMaterial();
  return { tlsCertContent: material.cert, tlsKeyContent: material.key };
}

/**
 * Returns the shared self-signed test cert/key pair.
 *
 * On Node the certificate is appended to the active default CA list so
 * `fetch` keeps full TLS verification — no `NODE_TLS_REJECT_UNAUTHORIZED`,
 * no `rejectUnauthorized: false`. Under Bun the default-CA store is not
 * consulted by `fetch`; use `tlsFetch` (or the transport `fetch` option)
 * which passes `tls.ca` per request instead.
 */
export function getTestTlsMaterial(): TestTlsMaterial {
  const material = loadTestTlsMaterial();
  trustTestCa(material.cert);
  return material;
}

/**
 * `fetch` that trusts the generated test certificate via Bun's `tls.ca`
 * request option. On Node the CA store already trusts it (see above), so the
 * extra init key is ignored.
 */
export function tlsFetch(
  url: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const material = getTestTlsMaterial();
  const { hostname } = new URL(url);
  // This helper exists for loopback test servers only — never forward it
  // arbitrary URLs (Codacy SSRF pattern).
  if (
    hostname !== '127.0.0.1' &&
    hostname !== 'localhost' &&
    hostname !== '::1' &&
    hostname !== '[::1]'
  ) {
    throw new Error(
      `tlsFetch is restricted to loopback hosts, got ${hostname}`,
    );
  }
  // nosemgrep — test-only helper; hostname is restricted to loopback above.
  return fetch(url, {
    ...init,
    tls: { ca: material.cert },
  } as RequestInit);
}

/**
 * `startHttpServer` pre-wired for tests: loopback HTTPS on an ephemeral port
 * with the generated self-signed material, empty multi-system registry, and a
 * silent logger. Pass overrides via `options`.
 */
export function startTestServer(
  options: HttpServerOptions = {},
): Promise<RunningHttpServer> {
  return startHttpServer({
    ...testTlsOptions(),
    port: 0,
    host: '127.0.0.1',
    multiSystem: { systems: {}, resolve: () => undefined },
    log: () => undefined,
    ...options,
  });
}

/**
 * Destination registry stub whose lease/context factories only count calls.
 * `createClient` overrides the stub client when a test needs real methods.
 */
export function testDestinationRegistry(createClient?: () => Promise<never>): {
  registry: DestinationContextRegistry;
  stats: { leases: number; contexts: number };
} {
  const stats = { leases: 0, contexts: 0 };
  const registry = createDestinationContextRegistry({
    leaseProvider: {
      async acquire({ destination }) {
        stats.leases++;
        return {
          destination,
          expiresAt: Date.now() + 60_000,
          version: 1,
          material: {},
          release: async () => undefined,
        };
      },
    },
    contextFactory: {
      async create() {
        stats.contexts++;
        return {
          client: createClient ? await createClient() : ({} as never),
          close: async () => undefined,
        };
      },
    },
    ttlMs: 0,
  });
  return { registry, stats };
}

/** Assert an MCP tool result is the `mcp_scope_denied` error. */
export function assertScopeDenied(result: {
  isError?: boolean;
  content?: unknown;
}): void {
  assert.strictEqual(result.isError, true);
  assert.strictEqual(
    (result.content as Array<{ type: 'text'; text: string }>)[0]?.text,
    'mcp_scope_denied',
  );
}

/** StreamableHTTP client transport wired to `tlsFetch`. */
export function createTlsTransport(
  url: string,
  options: StreamableHTTPClientTransportOptions = {},
): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(url), {
    fetch: tlsFetch,
    ...options,
  });
}
