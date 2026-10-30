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
 * - /sap/bc/adt/atc/checkvariants → atc.checkvariants (manual - formtemplate)
 */

import { http, contract } from '../../base';
import { atcworklist, atc, atcRun, chkvFormTemplate } from '../../schemas';

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
 * /sap/bc/adt/atc/checkvariants - Extended
 *
 * Adds the form template read endpoint not in generated contracts
 */
const checkvariantsExtended = contract({
  /**
   * GET /sap/bc/adt/atc/checkvariants/formtemplate{?chkvName}
   *
   * Reads a check variant's form template: the check catalog with every
   * available check category and its checks. Each check carries its
   * implementing class; worklist findings carry a GUID checkId, so the
   * class is matched via each finding's documentation page.
   *
   * NOTE: Not in SAP discovery - manually defined
   * @source live S/4 system capture, 2026-10-21
   */
  formtemplate: (params?: { chkvName?: string }) =>
    http.get('/sap/bc/adt/atc/checkvariants/formtemplate', {
      query: params,
      responses: { 200: chkvFormTemplate },
      headers: { Accept: 'application/xml' },
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
 * - checkvariants.formtemplate (not in discovery)
 */
export const atcContract = {
  customizing,
  runs,
  results: resultsContract,
  checkvariants: {
    ...checkvariantsExtended,
  },
  worklists: {
    ...worklistsContract,
    ...worklistsExtended,
  },
};

/** Type alias for the ATC contract */
export type AtcContract = typeof atcContract;
