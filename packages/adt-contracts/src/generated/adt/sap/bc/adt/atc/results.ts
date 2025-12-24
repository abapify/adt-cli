/**
 * ATC results
 *
 * Endpoint: /sap/bc/adt/atc/results
 * Category: atcresults
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { atcworklist } from '#schemas';

export const resultsContract = contract({
  /**
   * GET ATC results
   */
  active: (params?: { activeResult?: string; contactPerson?: string }) =>
    http.get('/sap/bc/adt/atc/results', {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: 'application/xml' },
    }),
  /**
   * GET ATC results
   */
  activeforsysid: (params?: {
    activeResult?: string;
    contactPerson?: string;
    sysId?: string;
  }) =>
    http.get('/sap/bc/adt/atc/results', {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: 'application/xml' },
    }),
  /**
   * GET ATC results
   */
  user: (params?: {
    createdBy?: string;
    ageMin?: string;
    ageMax?: string;
    contactPerson?: string;
  }) =>
    http.get('/sap/bc/adt/atc/results', {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: 'application/xml' },
    }),
  /**
   * GET ATC results
   */
  central: (params?: {
    centralResult?: string;
    createdBy?: string;
    contactPerson?: string;
    ageMin?: string;
    ageMax?: string;
  }) =>
    http.get('/sap/bc/adt/atc/results', {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: 'application/xml' },
    }),
  /**
   * GET ATC results
   */
  centralforsysid: (params?: {
    centralResult?: string;
    createdBy?: string;
    contactPerson?: string;
    ageMin?: string;
    ageMax?: string;
    sysId?: string;
  }) =>
    http.get('/sap/bc/adt/atc/results', {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: 'application/xml' },
    }),
  /**
   * GET ATC results
   */
  displayid: (
    displayId: string,
    params?: {
      activeResult?: string;
      contactPerson?: string;
      includeExemptedFindings?: string;
    },
  ) =>
    http.get(`/sap/bc/adt/atc/results/${displayId}`, {
      query: params,
      responses: { 200: atcworklist },
      headers: { Accept: 'application/xml' },
    }),
});

export type ResultsContract = typeof resultsContract;
