/**
 * DDIC Database Table Contract
 *
 * ADT endpoint: /sap/bc/adt/ddic/tables
 * Content-Type: application/vnd.sap.adt.tables.v2+xml
 * Object type: TABL/DT (tabldt)
 *
 * Uses the custom blueSource wrapper schema because SAP wraps
 * TABL responses in a blue:blueSource root element
 * (namespace http://www.sap.com/wbobj/blue) extending AbapSourceMainObject.
 */

import { crud } from '../../helpers/crud';
import { http } from '@abapify/speci/rest';
import {
  blueSource as blueSourceSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * Table response type - exported for consumers (ADK, etc.)
 */
export type TableResponse = InferTypedSchema<typeof blueSourceSchema>;

export type TablesContract = typeof tablesContract;

const basePath = '/sap/bc/adt/ddic/tables';
const contentType = 'application/vnd.sap.adt.tables.v2+xml';
const accept =
  'application/vnd.sap.adt.blues.v1+xml, application/vnd.sap.adt.tables.v2+xml';

export const tablesContract = {
  ...crud({
    basePath,
    schema: blueSourceSchema,
    contentType,
    accept,
  }),

  objectstructure: (name: string, options?: { version?: string }) =>
    http.get(`${basePath}/${name.toLowerCase()}/objectstructure`, {
      responses: { 200: undefined },
      query: options?.version ? { version: options.version } : undefined,
    }),
};
