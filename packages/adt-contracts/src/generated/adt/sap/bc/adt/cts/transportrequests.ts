/**
 * Transport Management
 *
 * Endpoint: /sap/bc/adt/cts/transportrequests
 * Category: transportmanagement
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { transportmanagment } from '#schemas';

export const transportrequestsContract = contract({
  /**
   * GET Transport Management
   */
  transportrequests: (params?: { targets?: string }) =>
    http.get('/sap/bc/adt/cts/transportrequests', {
      query: params,
      responses: { 200: transportmanagment },
      headers: { Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml' },
    }),
  /**
   * GET Transport Management
   */
  attribute: (name: string, params?: { maxItemCount?: string }) =>
    http.get(`/sap/bc/adt/cts/transportrequests/valuehelp/attribute${name}`, {
      query: params,
      responses: { 200: transportmanagment },
      headers: { Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml' },
    }),
  /**
   * GET Transport Management
   */
  target: (name: string, params?: { maxItemCount?: string }) =>
    http.get(`/sap/bc/adt/cts/transportrequests/valuehelp/target${name}`, {
      query: params,
      responses: { 200: transportmanagment },
      headers: { Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml' },
    }),
  /**
   * GET Transport Management
   */
  ctsproject: (name: string, params?: { maxItemCount?: string }) =>
    http.get(`/sap/bc/adt/cts/transportrequests/valuehelp/ctsproject${name}`, {
      query: params,
      responses: { 200: transportmanagment },
      headers: { Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml' },
    }),
  /**
   * GET Transport Management
   */
  object: (field: string, name: string, params?: { maxItemCount?: string }) =>
    http.get(
      `/sap/bc/adt/cts/transportrequests/valuehelp/object/${field}${name}`,
      {
        query: params,
        responses: { 200: transportmanagment },
        headers: {
          Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        },
      },
    ),
});

export type TransportrequestsContract = typeof transportrequestsContract;
