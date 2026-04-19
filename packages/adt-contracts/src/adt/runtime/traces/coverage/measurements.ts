/**
 * /sap/bc/adt/runtime/traces/coverage/measurements/{id}
 *
 * POST returns the ABAP coverage tree (cov:result) for a previously
 * created measurement. Used as the second step of the aunit → coverage
 * flow: aunit run → atom:link to measurement → POST this endpoint.
 *
 * Content-Type: application/xml+scov
 * Accept:       application/xml+scov
 */

import { http, contract } from '../../../../base';
import { acoverageResult } from '../../../../schemas';

const SCOV_CONTENT_TYPE = 'application/xml+scov';

export const measurements = contract({
  /**
   * POST /sap/bc/adt/runtime/traces/coverage/measurements/{identifier}
   *   ?withAdditionalTypeInfo=true
   *
   * Returns the coverage tree rooted at ADT_ROOT_NODE with coverage
   * totals (branch/procedure/statement) for each object reference.
   */
  post: (identifier: string) =>
    http.post(
      `/sap/bc/adt/runtime/traces/coverage/measurements/${identifier}`,
      {
        query: { withAdditionalTypeInfo: true },
        responses: { 200: acoverageResult },
        headers: {
          Accept: SCOV_CONTENT_TYPE,
          'Content-Type': SCOV_CONTENT_TYPE,
        },
      },
    ),
});

export type MeasurementsContract = typeof measurements;
