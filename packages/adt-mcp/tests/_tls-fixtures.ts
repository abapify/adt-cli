import tls from 'node:tls';
import {
  startHttpServer,
  type HttpServerOptions,
  type RunningHttpServer,
} from '../src/lib/http/server.js';
import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  getTestTlsMaterial as loadTestTlsMaterial,
  type TestTlsMaterial,
} from '@abapify/adt-fixtures';

export type { TestTlsMaterial };

const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined';
let caInstalled = false;

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
 * On Node the certificate is appended to the default CA store so `fetch`
 * keeps full TLS verification — no `NODE_TLS_REJECT_UNAUTHORIZED`, no
 * `rejectUnauthorized: false`. Under Bun the default-CA store is not
 * consulted by `fetch`; use `tlsFetch` (or the transport `fetch` option)
 * which passes `tls.ca` per request instead.
 */
export function getTestTlsMaterial(): TestTlsMaterial {
  const material = loadTestTlsMaterial();
  if (!isBun && !caInstalled) {
    tls.setDefaultCACertificates([...tls.rootCertificates, material.cert]);
    caInstalled = true;
  }
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
  return fetch(url, {
    // nosemgrep — test helper, restricted to loopback above
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
