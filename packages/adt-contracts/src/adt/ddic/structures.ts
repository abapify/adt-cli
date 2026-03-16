/**
 * DDIC Structure Contract
 *
 * ADT endpoint: /sap/bc/adt/ddic/structures
 * Content-Type: application/vnd.sap.adt.structures.v2+xml
 * Object type: TABL/DS (tablds)
 *
 * Uses the custom blueSource wrapper schema because SAP wraps
 * structure responses in a blue:blueSource root element
 * (namespace http://www.sap.com/wbobj/blue) extending AbapSourceMainObject.
 */

import { crud } from '../../helpers/crud';
import { http } from '@abapify/speci/rest';
import {
  blueSource as blueSourceSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * Structure response type - exported for consumers (ADK, etc.)
 */
export type StructureResponse = InferTypedSchema<typeof blueSourceSchema>;

export type StructuresContract = typeof structuresContract;

const basePath = '/sap/bc/adt/ddic/structures';
const contentType = 'application/vnd.sap.adt.structures.v2+xml';
const accept =
  'application/vnd.sap.adt.structures.v2+xml, application/vnd.sap.adt.structures.v1+xml';

export const structuresContract = {
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
