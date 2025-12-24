/**
 * Transport Search Configurations (Metadata)
 *
 * Endpoint: /sap/bc/adt/cts/transportrequests/searchconfiguration/metadata
 * Category: transportconfigurationsmetadata
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { transportmanagment } from '#schemas';

export const metadataContract = contract({
  /**
   * GET Transport Search Configurations (Metadata)
   */
  get: () =>
    http.get('/sap/bc/adt/cts/transportrequests/searchconfiguration/metadata', {
      responses: { 200: transportmanagment },
      headers: { Accept: 'application/xml' },
    }),
});

export type MetadataContract = typeof metadataContract;
