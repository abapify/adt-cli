/**
 * /sap/bc/adt/runtime/traces/coverage/measurements/{id}
 *
 * POST returns the ABAP coverage tree (cov:result) for a previously
 * created measurement. Used as the second step of the aunit → coverage
 * flow: aunit run → atom:link to measurement → POST this endpoint.
 *
 * Content-Type: application/xml
 * Accept:       application/xml
 */

import { http, contract } from '../../../../base';
import { acoverageResult } from '../../../../schemas';
import { coverageXmlBody } from './request';

const XML_CONTENT_TYPE = 'application/xml';

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
        body: coverageXmlBody,
        responses: { 200: acoverageResult },
        headers: {
          Accept: XML_CONTENT_TYPE,
          'Content-Type': 'application/xml',
        },
      },
    ),
});

export type MeasurementsContract = typeof measurements;
