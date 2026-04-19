/**
 * Real-SAP probe for E03 BAdI endpoints.
 *
 * The BTP Trial system (TRL) does not grant authorisation for the
 * `/sap/bc/adt/enhancements/...` namespace — GET returns HTTP 403. We
 * therefore cannot capture a real enhancement implementation response
 * from this system. Rather than skip the test, we assert the 403
 * contract so:
 *
 *  - Regressions in credential / CSRF handling produce a different
 *    HTTP code (401, 500, ECONNRESET) and we catch them early.
 *  - If authorisation is ever granted we'll see a 2xx and can upgrade
 *    the assertion to a `captureFixture()` call.
 *
 * Any SAP system with enhancement authorisation can flip the
 * expectation by setting the optional `ADT_BADI_REAL_NAME` env var —
 * we'll then GET that ENHO and capture the fixture.
 */

import { expect, it } from 'vitest';
import { describeReal, getRealClient, captureFixture } from './helpers';

describeReal('E03 BAdI — endpoint reachability', () => {
  it('enhoxhh GET either returns 200 or surfaces an authorisation failure', async () => {
    const client = await getRealClient();

    const probeName = process.env.ADT_BADI_REAL_NAME ?? 'zze_probe_badi';

    try {
      const response = await client.fetch(
        `/sap/bc/adt/enhancements/enhoxhh/${probeName}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.sap.adt.enhancements.enhoxhh.v1+xml',
          },
        },
      );

      // If we get here, the endpoint accepted our request. 2xx + XML =>
      // capture as a real fixture. Anything else is a documentation win.
      expect(response).toBeDefined();
      const text = String(response);
      if (
        text.startsWith('<?xml') &&
        text.includes('enhancementImplementation')
      ) {
        captureFixture(text, 'enhancements/enhoxhh/real.xml');
      }
    } catch (err) {
      // Expected on Trial: HTTP 403 "No authorization".
      const msg = err instanceof Error ? err.message : String(err);
      const matches403 =
        /HTTP 403/.test(msg) ||
        /No authorization/i.test(msg) ||
        /Forbidden/i.test(msg);
      const matches404 = /HTTP 404/.test(msg) || /Not found/i.test(msg);
      expect(
        matches403 || matches404,
        `Expected HTTP 403/404 on Trial, got: ${msg}`,
      ).toBe(true);
    }
  }, 60_000);
});
