/**
 * ATC worklist
 *
 * Endpoint: /sap/bc/adt/atc/worklists
 * Category: atcworklists
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { atcworklist } from '#schemas';

export const worklistsContract = contract({
  /**
   * GET ATC worklist
   */
  get: (
    worklistId: string,
    params?: {
      timestamp?: string;
      usedObjectSet?: string;
      includeExemptedFindings?: string;
    },
  ) =>
    http.get(`/sap/bc/adt/atc/worklists/${worklistId}`, {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: '*/*' },
    }),
  /**
   * GET ATC worklist
   */
  objectset: (
    worklistId: string,
    objectSetName: string,
    params?: { timestamp?: string; includeExemptedFindings?: string },
  ) =>
    http.get(`/sap/bc/adt/atc/worklists/${worklistId}/${objectSetName}`, {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: '*/*' },
    }),
});

export type WorklistsContract = typeof worklistsContract;
