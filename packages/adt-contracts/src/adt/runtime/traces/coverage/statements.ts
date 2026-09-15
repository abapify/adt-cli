/**
 * /sap/bc/adt/runtime/traces/coverage/results/{id}/statements
 *
 * POST returns the cov:statementsBulkResponse with per-method statement
 * / branch / procedure coverage details.
 *
 * Content-Type: application/xml
 * Accept:       application/xml
 */

import { http, contract } from '../../../../base';
import { acoverageStatements } from '../../../../schemas';
import { coverageXmlBody } from './request';

const XML_CONTENT_TYPE = 'application/xml';

export const statements = contract({
  /**
   * POST /sap/bc/adt/runtime/traces/coverage/results/{identifier}/statements
   */
  post: (identifier: string) =>
    http.post(
      `/sap/bc/adt/runtime/traces/coverage/results/${identifier}/statements`,
      {
        body: coverageXmlBody,
        responses: { 200: acoverageStatements },
        headers: {
          Accept: XML_CONTENT_TYPE,
          'Content-Type': 'application/xml',
        },
      },
    ),
});

export type StatementsContract = typeof statements;
