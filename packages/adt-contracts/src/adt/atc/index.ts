/**
 * ADT ATC (ABAP Test Cockpit) Contracts
 *
 * Combines generated contracts with manually-defined endpoints not in discovery.
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/atc/customizing → atc.customizing (manual - not in discovery)
 * - /sap/bc/adt/atc/runs → atc.runs (manual - POST with body)
 * - /sap/bc/adt/atc/results → atc.results (generated)
 * - /sap/bc/adt/atc/worklists → atc.worklists (generated + manual create)
 */

import { http, contract } from '../../base';
import { atcworklist, atc, atcRun } from '../../schemas';

// Re-export generated contracts
export { worklistsContract } from '../../generated/adt/sap/bc/adt/atc/worklists';
export { resultsContract } from '../../generated/adt/sap/bc/adt/atc/results';

/**
 * /sap/bc/adt/atc/customizing
 * Get ATC customizing settings (check variants, exemption reasons, etc.)
 *
 * NOTE: Not in SAP discovery - manually defined
 */
const customizing = contract({
  /**
   * GET /sap/bc/adt/atc/customizing
   */
  get: () =>
    http.get('/sap/bc/adt/atc/customizing', {
      responses: { 200: atc },
      headers: { Accept: 'application/xml' },
    }),
});

/**
 * /sap/bc/adt/atc/runs
 *
 * NOTE: POST endpoint with body - not in SAP discovery
 * @source atcruns.json
 */
const runs = contract({
  /**
   * POST /sap/bc/adt/atc/runs{?worklistId,clientWait}
   * Run ATC checks on objects specified in the request body
   */
  post: (params?: { worklistId?: string; clientWait?: boolean }) =>
    http.post('/sap/bc/adt/atc/runs', {
      query: params,
      body: atcRun,
      responses: { 200: atcworklist },
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml',
      },
    }),
});

/**
 * /sap/bc/adt/atc/worklists - Extended
 *
 * Adds POST (create) endpoint not in generated contract
 */
const worklistsExtended = contract({
  /**
   * POST /sap/bc/adt/atc/worklists{?checkVariant}
   * Create a new ATC worklist
   *
   * NOTE: Not in SAP discovery - manually defined
   */
  create: (params?: { checkVariant?: string }) =>
    http.post('/sap/bc/adt/atc/worklists', {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: '*/*' },
    }),
});

// Import generated contracts for combined export
import { worklistsContract } from '../../generated/adt/sap/bc/adt/atc/worklists';
import { resultsContract } from '../../generated/adt/sap/bc/adt/atc/results';

/**
 * Combined ATC contract
 *
 * Uses generated contracts where available, adds manual endpoints for:
 * - customizing (not in discovery)
 * - runs POST (not in discovery)
 * - worklists.create (not in discovery)
 */
export const atcContract = {
  customizing,
  runs,
  results: resultsContract,
  worklists: {
    ...worklistsContract,
    ...worklistsExtended,
  },
};

/** Type alias for the ATC contract */
export type AtcContract = typeof atcContract;
