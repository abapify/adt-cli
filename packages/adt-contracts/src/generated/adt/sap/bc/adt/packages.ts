/**
 * Package
 *
 * Endpoint: /sap/bc/adt/packages
 * Category: devck
 *
 * @generated - DO NOT EDIT MANUALLY
 */

import { http, contract } from '#base';
import { packagesV1 } from '#schemas';

export const packagesContract = contract({
  /**
   * GET Package
   */
  properties: (
    object_name: string,
    params?: {
      corrNr?: string;
      lockHandle?: string;
      version?: string;
      accessMode?: string;
      _action?: string;
    },
  ) =>
    http.get(`/sap/bc/adt/packages/${object_name}`, {
      query: params,
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
  /**
   * GET Package
   */
  checkuseaccess: (packagename: string, packageinterfacename: string) =>
    http.get(
      `/sap/bc/adt/packages/${packagename}/useaccesses/${packageinterfacename}`,
      {
        responses: { 200: packagesV1 },
        headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
      },
    ),
  /**
   * GET Package
   */
  tree: (params?: { packagename?: string; type?: string }) =>
    http.get('/sap/bc/adt/packages/$tree', {
      query: params,
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
  /**
   * GET Package
   */
  applicationcomponents: () =>
    http.get('/sap/bc/adt/packages/valuehelps/applicationcomponents', {
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
  /**
   * GET Package
   */
  softwarecomponents: () =>
    http.get('/sap/bc/adt/packages/valuehelps/softwarecomponents', {
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
  /**
   * GET Package
   */
  transportlayers: () =>
    http.get('/sap/bc/adt/packages/valuehelps/transportlayers', {
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
  /**
   * GET Package
   */
  translationrelevances: () =>
    http.get('/sap/bc/adt/packages/valuehelps/translationrelevances', {
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
  /**
   * GET Package
   */
  abaplanguageversions: () =>
    http.get('/sap/bc/adt/packages/valuehelps/abaplanguageversions', {
      responses: { 200: packagesV1 },
      headers: { Accept: 'application/vnd.sap.adt.packages.v2+xml' },
    }),
});

export type PackagesContract = typeof packagesContract;
