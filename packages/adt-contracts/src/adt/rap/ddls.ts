/**
 * RAP CDS View Entity Contract (DDLS)
 *
 * ADT endpoint: /sap/bc/adt/ddl/ddls
 * Content-Type: application/vnd.sap.adt.ddl.ddlsource.v2+xml
 * Object type: DDLS (Data Definition Language Source)
 *
 * Supports CRUD operations for CDS View Entities and Data Definitions.
 * These are used extensively in RAP for defining the data model layer.
 */

import { crud } from '../../helpers/crud';
import { http } from '../../base';
import { adtcore, type InferTypedSchema } from '../../schemas';

const basePath = '/sap/bc/adt/ddl/ddls';
const contentType = 'application/vnd.sap.adt.ddl.ddlsource.v2+xml';
const accept =
  'application/vnd.sap.adt.ddl.ddlsource.v2+xml, application/vnd.sap.adt.ddl.ddlsource.v1+xml';

export type DdlsResponse = InferTypedSchema<typeof adtcore>;

export const ddlsContract = {
  ...crud({
    basePath,
    schema: adtcore,
    contentType,
    accept,
    nameTransform: (name: string) => name.toLowerCase(),
  }),

  source: {
    get: (name: string) =>
      http.get(`${basePath}/${name.toLowerCase()}/source/main`, {
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain' },
      }),
    put: (name: string, options?: { lockHandle?: string; corrNr?: string }) =>
      http.put(`${basePath}/${name.toLowerCase()}/source/main`, {
        body: undefined as unknown as string,
        responses: { 200: undefined as unknown as string },
        headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
        query: {
          ...(options?.lockHandle && { lockHandle: options.lockHandle }),
          ...(options?.corrNr && { corrNr: options.corrNr }),
        },
      }),
  },

  parent: {
    get: (name: string) =>
      http.get(`${basePath}/${name.toLowerCase()}/parent`, {
        responses: { 200: adtcore },
        headers: { Accept: 'application/xml' },
      }),
  },
};

export type DdlsContract = typeof ddlsContract;
