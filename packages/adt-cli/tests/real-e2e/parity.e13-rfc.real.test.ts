/**
 * Real-SAP e2e for E13 — SOAP-over-HTTP RFC.
 *
 * Calls `STFC_CONNECTION` — one of the safest RFC function modules
 * shipped on every SAP system — via the /sap/bc/soap/rfc wrapper and
 * asserts the server echoes REQUTEXT into ECHOTEXT.
 *
 * Graceful skip: some SAP systems (incl. hardened Trials) disable
 * `/sap/bc/soap/rfc`. If the server returns 401/403/404/501, we
 * surface a clear skip message and the test passes without calling SAP.
 */

import { expect, it } from 'vitest';
import {
  createRfcClient,
  RfcTransportUnavailable,
  type RfcResponse,
} from '@abapify/adt-rfc';
import { describeReal, getRealClient } from './helpers';

describeReal('E13 SOAP-RFC', () => {
  it('STFC_CONNECTION echoes REQUTEXT via /sap/bc/soap/rfc (or skip if disabled)', async () => {
    const client = await getRealClient();
    const rfc = createRfcClient({
      fetch: (url, opts) => client.fetch(url, opts) as Promise<unknown>,
    });

    let response: RfcResponse;
    try {
      response = await rfc.call('STFC_CONNECTION', {
        REQUTEXT: 'hello',
      });
    } catch (err) {
      if (err instanceof RfcTransportUnavailable) {
        // Documented skip path — see docs/roadmap/epics/e13-startrfc.md.
        // eslint-disable-next-line no-console
        console.warn(
          `[E13] SOAP-RFC not enabled on real SAP system: HTTP ${err.status}. Skipping.`,
        );
        return;
      }
      throw err;
    }

    expect(response.ECHOTEXT).toBe('hello');
    expect(typeof response.RESPTEXT).toBe('string');
    expect(String(response.RESPTEXT).length).toBeGreaterThan(0);
  }, 120_000);
});
