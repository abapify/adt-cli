/**
 * DDIC Data Element Contract
 *
 * ADT endpoint: /sap/bc/adt/ddic/dataelements
 * Content-Type: application/vnd.sap.adt.dataelements.v2+xml
 * Object type: DTEL/DE (dtelde)
 */

import { crud } from '../../helpers/crud';
import {
  dataelementWrapper as dataelementWrapperSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * Data Element response type - exported for consumers (ADK, etc.)
 *
 * Uses the custom wrapper schema because SAP wraps the inner
 * dtel:dataElement content in a blue:wbobj root element
 * (namespace http://www.sap.com/wbobj/dictionary/dtel).
 */
export type DataElementResponse = InferTypedSchema<
  typeof dataelementWrapperSchema
>;

export type DataelementsContract = typeof dataelementsContract;

export const dataelementsContract = crud({
  basePath: '/sap/bc/adt/ddic/dataelements',
  schema: dataelementWrapperSchema,
  contentType: 'application/vnd.sap.adt.dataelements.v2+xml',
  accept:
    'application/vnd.sap.adt.dataelements.v2+xml, application/vnd.sap.adt.dataelements.v1+xml',
});
