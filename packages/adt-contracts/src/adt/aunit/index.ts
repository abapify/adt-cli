/**
 * ADT AUnit (ABAP Unit) Contracts
 *
 * Manually-defined endpoints for ABAP Unit test runs.
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/abapunit/testruns → aunit.testruns (POST with body)
 */

import { http, contract } from '../../base';
import { aunitRun, aunitResult } from '../../schemas';

/**
 * /sap/bc/adt/abapunit/testruns
 *
 * Run ABAP Unit tests on objects specified in the request body.
 *
 * NOTE: Not in SAP discovery - manually defined
 */
const testruns = contract({
  /**
   * POST /sap/bc/adt/abapunit/testruns
   * Execute ABAP Unit test run with a runConfiguration body
   *
   * @returns runResult with programs, test classes, methods, and alerts
   */
  post: () =>
    http.post('/sap/bc/adt/abapunit/testruns', {
      body: aunitRun,
      responses: { 200: aunitResult },
      headers: {
        Accept: 'application/vnd.sap.adt.abapunit.testruns.result.v2+xml',
        'Content-Type':
          'application/vnd.sap.adt.abapunit.testruns.config.v4+xml',
      },
    }),
});

/**
 * Combined AUnit contract
 */
export const aunitContract = {
  testruns,
};

export type AunitContract = typeof aunitContract;

export { extractCoverageMeasurementId } from './coverage-link';
export type {
  CoverageLinkCandidate,
  CoverageLinkSource,
} from './coverage-link';
