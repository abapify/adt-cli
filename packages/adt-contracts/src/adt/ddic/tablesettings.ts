/**
 * DDIC Database Table Settings Contract
 *
 * ADT endpoint: /sap/bc/adt/ddic/db/settings/{name}
 * Content-Type: application/vnd.sap.adt.table.settings.v2+xml
 *
 * Returns the technical DD09L settings for a database table as an XML
 * document. ADK currently consumes this as raw text, so the contract is
 * typed as a plain-text endpoint.
 */

import { http, contract } from '../../base';

const basePath = '/sap/bc/adt/ddic/db/settings';

export const tablesettingsContract = contract({
  /** GET /sap/bc/adt/ddic/db/settings/{name} - Retrieve table settings XML */
  get: (name: string) =>
    http.get(`${basePath}/${name.toLowerCase()}`, {
      responses: { 200: undefined as unknown as string },
      headers: {
        Accept: 'application/vnd.sap.adt.table.settings.v2+xml',
      },
    }),
});

export type TableSettingsContract = typeof tablesettingsContract;
