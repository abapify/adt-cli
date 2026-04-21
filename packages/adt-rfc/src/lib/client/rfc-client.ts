/**
 * High-level RFC client — SOAP-over-HTTP transport by default.
 *
 * The client is deliberately decoupled from `@abapify/adt-client` at the
 * type level: callers pass a *fetcher* function matching the minimal
 * shape of `AdtClient.fetch()`. This keeps `adt-rfc` a leaf package
 * with no workspace dependencies (and avoids a circular graph once the
 * CLI wires the two together).
 */

import {
  buildRfcSoapEnvelope,
  parseRfcSoapResponse,
} from '../transport/soap-rfc';
import {
  RfcTransportUnavailable,
  type RfcCallOptions,
  type RfcParams,
  type RfcResponse,
} from '../transport/types';

/**
 * Raw fetcher signature the RFC client depends on.
 * Matches `AdtClient.fetch()` — callers pass
 * `(url, options) => client.fetch(url, options)`.
 */
export type RawFetcher = (
  url: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<unknown>;

export interface RfcClientConfig {
  /**
   * A fetcher that performs authenticated HTTP requests against the SAP
   * system. Must already handle CSRF / session cookies.
   *
   * Signature matches `AdtClient.fetch()`.
   */
  fetch: RawFetcher;

  /**
   * Default `sap-client` (e.g. "100") appended as query parameter.
   * Optional — most SAP deployments can infer it from the cookie.
   */
  client?: string;
}

export interface RfcClient {
  /**
   * Invoke an RFC function module synchronously.
   *
   * @param fmName  - Function module name (case-insensitive).
   * @param params  - Importing / changing / tables parameters (flat map).
   * @param options - Per-call overrides.
   */
  call(
    fmName: string,
    params?: RfcParams,
    options?: RfcCallOptions,
  ): Promise<RfcResponse>;
}

function buildSoapRfcUrl(client?: string): string {
  const base = '/sap/bc/soap/rfc';
  if (!client) return base;
  return `${base}?sap-client=${encodeURIComponent(client)}`;
}

/**
 * Create an RFC client backed by the SOAP-over-HTTP transport.
 *
 * @example
 * ```ts
 * import { createAdtClient } from '@abapify/adt-client';
 * import { createRfcClient } from '@abapify/adt-rfc';
 *
 * const adt = createAdtClient({ …auth });
 * const rfc = createRfcClient({ fetch: (url, opts) => adt.fetch(url, opts) });
 *
 * const resp = await rfc.call('STFC_CONNECTION', { REQUTEXT: 'hello' });
 * console.log(resp.ECHOTEXT); // "hello"
 * ```
 */
export function createRfcClient(config: RfcClientConfig): RfcClient {
  return {
    async call(
      fmName: string,
      params: RfcParams = {},
      options: RfcCallOptions = {},
    ): Promise<RfcResponse> {
      const envelope = buildRfcSoapEnvelope(fmName, params);
      const url = buildSoapRfcUrl(options.client ?? config.client);

      let response: unknown;
      try {
        response = await config.fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            // SAP expects SOAPAction — empty is fine for RFC SOAP wrapper.
            SOAPAction: '""',
            Accept: 'text/xml',
          },
          body: envelope,
        });
      } catch (err) {
        // Detect HTTP-level "endpoint not available" errors raised by the
        // underlying fetcher. `AdtClient.fetch()` throws errors whose
        // `message` usually contains the status code.
        const msg = err instanceof Error ? err.message : String(err);
        const statusMatch = /\b(401|403|404|501)\b/.exec(msg);
        if (statusMatch) {
          throw new RfcTransportUnavailable(Number(statusMatch[1]), url, msg);
        }
        throw err;
      }

      // Fallback coercion of the fetch result to XML text. JSON.stringify
      // can throw on circular refs or BigInt; guard against that so an
      // unrelated serialization error doesn't mask the real SOAP failure
      // downstream in parseRfcSoapResponse.
      const coerceToXml = (value: unknown): string => {
        if (typeof value === 'string') return value;
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }
        return String(value);
      };
      const xml = coerceToXml(response);
      return parseRfcSoapResponse(xml);
    },
  };
}
