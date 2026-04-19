/**
 * /sap/bc/adt/runtime/traces/coverage/results/{id}/statements
 *
 * GET returns the cov:statementsBulkResponse with per-method statement
 * / branch / procedure coverage details.
 *
 * Content-Type: application/xml+scov
 */

import { http, contract } from '../../../../base';
import { acoverageStatements } from '../../../../schemas';

const SCOV_CONTENT_TYPE = 'application/xml+scov';

export const statements = contract({
  /**
   * GET /sap/bc/adt/runtime/traces/coverage/results/{identifier}/statements
   */
  get: (identifier: string) =>
    http.get(
      `/sap/bc/adt/runtime/traces/coverage/results/${identifier}/statements`,
      {
        responses: { 200: acoverageStatements },
        headers: {
          Accept: SCOV_CONTENT_TYPE,
        },
      },
    ),
});

export type StatementsContract = typeof statements;
