/**
 * DDIC Table Type Contract
 *
 * ADT endpoint: /sap/bc/adt/ddic/tabletypes
 * Content-Type: application/vnd.sap.adt.tabletype.v1+xml
 * Object type: TTYP/TT
 */

import { crud } from '../../helpers/crud';
import {
  tabletype as tabletypeSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * Table Type response type - exported for consumers (ADK, etc.)
 */
export type TableTypeResponse = InferTypedSchema<typeof tabletypeSchema>;

export type TabletypesContract = typeof tabletypesContract;

export const tabletypesContract = crud({
  basePath: '/sap/bc/adt/ddic/tabletypes',
  schema: tabletypeSchema,
  contentType: 'application/vnd.sap.adt.tabletype.v1+xml',
  accept:
    'application/vnd.sap.adt.tabletypes.v2+xml, application/vnd.sap.adt.tabletypes.v1+xml, application/vnd.sap.adt.blues.v1+xml',
});
