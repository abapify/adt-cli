/**
 * Transport Management
 *
 * Endpoint: /sap/bc/adt/cts/transportrequests/reference
 * Category: transportmanagementref
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { transportmanagment } from '#schemas';

export const referenceContract = contract({
  /**
   * GET Transport Management
   */
  get: () =>
    http.get('/sap/bc/adt/cts/transportrequests/reference', {
      responses: { 200: transportmanagment },
      headers: { Accept: 'application/xml' },
    }),
});

export type ReferenceContract = typeof referenceContract;
