/**
 * ADT Checkruns Contract
 *
 * Manually-defined endpoint for ABAP syntax check runs.
 *
 * Structure mirrors URL tree:
 * - /sap/bc/adt/checkruns → checkruns.checkObjects (POST with body)
 *
 * NOTE: Not in SAP discovery - manually defined
 */

import { http, contract } from '../../base';
import { checkrun } from '../../schemas';

/**
 * /sap/bc/adt/checkruns
 *
 * Run a syntax/check-run on a list of ABAP objects.
 * Request body: checkObjectList (chkrun:CheckObjectList)
 * Response:     checkRunReports (chkrun:CheckReportList)
 */
const checkObjects = contract({
  /**
   * POST /sap/bc/adt/checkruns
   * Submit a checkObjectList and receive checkRunReports.
   *
   * Both request and response use the same `checkrun` schema (union discriminated
   * by the root element: `checkObjectList` for requests, `checkRunReports` for responses).
   */
  post: () =>
    http.post('/sap/bc/adt/checkruns', {
      body: checkrun,
      responses: { 200: checkrun },
      headers: {
        Accept: 'application/vnd.sap.adt.checkmessages+xml',
        'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
      },
    }),
});

/**
 * Combined Checkruns contract
 */
export const checkrunsContract = {
  checkObjects,
};

export type CheckrunsContract = typeof checkrunsContract;
