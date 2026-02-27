/**
 * /sap/bc/adt/cts/transportrequests/searchconfiguration/metadata
 * @schema configuration.xsd
 */

import { http, contract } from '../../../../base';
import { configuration } from '../../../../schemas';

export const metadata = contract({
  /** GET default search configuration metadata */
  get: () =>
    http.get('/sap/bc/adt/cts/transportrequests/searchconfiguration/metadata', {
      responses: { 200: configuration },
      headers: {
        Accept: 'application/vnd.sap.adt.configuration.metadata.v1+xml',
      },
    }),
});
