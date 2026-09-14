import tls from 'node:tls';
import {
  getTestTlsMaterial as loadTestTlsMaterial,
  type TestTlsMaterial,
} from '@abapify/adt-fixtures';

export type { TestTlsMaterial };

const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined';
let caInstalled = false;

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
  return fetch(url, {
    ...init,
    tls: { ca: material.cert },
  } as RequestInit);
}
