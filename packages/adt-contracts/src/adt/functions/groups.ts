/**
 * ADT Functions Groups Contract
 *
 * Endpoint: /sap/bc/adt/functions/groups
 * Full CRUD operations for ABAP function groups including source code management.
 */

import { crud } from '../../base';
import { groups, type InferTypedSchema } from '../../schemas';

/**
 * Function group response type - exported for consumers (ADK, etc.)
 *
 * This is the canonical type for function group metadata.
 * Uses pre-generated type from adt-schemas.
 */
export type FunctionGroupResponse = InferTypedSchema<typeof groups>;

/**
 * /sap/bc/adt/functions/groups
 * Full CRUD operations for ABAP function groups
 *
 * Includes:
 * - Basic CRUD: get, post, put, delete
 * - Lock/Unlock: lock, unlock
 * - Object structure: objectstructure
 * - Source code: source.main.get/put
 */
export const functionGroupsContract = crud({
  basePath: '/sap/bc/adt/functions/groups',
  schema: groups,
  contentType: 'application/vnd.sap.adt.functions.groups.v3+xml',
  accept:
    'application/vnd.sap.adt.functions.groups.v2+xml, application/vnd.sap.adt.functions.groups.v1+xml',
  sources: ['main'] as const,
});

/** Type alias for the function groups contract */
export type FunctionGroupsContract = typeof functionGroupsContract;
