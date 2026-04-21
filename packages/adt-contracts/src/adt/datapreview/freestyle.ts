/**
 * /sap/bc/adt/datapreview/freestyle
 *
 * Executes an ABAP Open SQL SELECT statement and returns the result set as
 * JSON.  Mirrors sapcli's `datapreview osql` command and the adt CLI
 * `datapreview osql` command.
 *
 *   POST /sap/bc/adt/datapreview/freestyle?rowCount=<n>&outputFormat=json[&noaging=true]
 *   Content-Type: text/plain
 *   Accept:       application/json
 *   Body:         raw ABAP SQL SELECT statement
 */

import { http } from '../../base';
import {
  dataPreviewFreestyleRequestSchema,
  dataPreviewFreestyleResponseSchema,
} from './schema';
/** Query parameters for `POST /datapreview/freestyle` */
export interface FreestyleQuery {
  /** Maximum number of rows to return (ADT default: 100) */
  rowCount?: number;
  /** Output format - always `json` for this contract */
  outputFormat?: 'json' | 'xml';
  /** Disable SAP aging (bypass browser cache flag) */
  noaging?: boolean;
}

export const freestyle = {
  /** POST /datapreview/freestyle - execute a free-style SQL query */
  post: (query?: FreestyleQuery) =>
    http.post('/sap/bc/adt/datapreview/freestyle', {
      body: dataPreviewFreestyleRequestSchema,
      responses: { 200: dataPreviewFreestyleResponseSchema },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      query: {
        outputFormat: query?.outputFormat ?? 'json',
        ...(query?.rowCount != null ? { rowCount: query.rowCount } : {}),
        ...(query?.noaging ? { noaging: true } : {}),
      },
    }),
};

export type FreestyleContract = typeof freestyle;
export {
  dataPreviewFreestyleResponseSchema,
  dataPreviewFreestyleRequestSchema,
} from './schema';
export type { DataPreviewFreestyleResponse } from './schema';
