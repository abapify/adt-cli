/**
 * ADT OO Interfaces Contract
 *
 * Endpoint: /sap/bc/adt/oo/interfaces
 * Full CRUD operations for ABAP interfaces including source code management.
 *
 * Uses the crud() helper with sources option for complete
 * interface operations including metadata and source code.
 */

import { crud } from '../../base';
import {
  interfaces as interfacesSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * Interface response type - exported for consumers (ADK, etc.)
 *
 * This is the canonical type for interface metadata.
 * Uses pre-generated type from adt-schemas.
 */
export type InterfaceResponse = InferTypedSchema<typeof interfacesSchema>;

/**
 * /sap/bc/adt/oo/interfaces
 * Full CRUD operations for ABAP interfaces
 *
 * Includes:
 * - Basic CRUD: get, post, put, delete
 * - Lock/Unlock: lock, unlock
 * - Object structure: objectstructure
 * - Source code: source.main.get/put
 */
export const interfacesContract = crud({
  basePath: '/sap/bc/adt/oo/interfaces',
  schema: interfacesSchema,
  contentType: 'application/vnd.sap.adt.oo.interfaces.v5+xml',
  sources: ['main'] as const,
});

/** Type alias for the interfaces contract */
export type InterfacesContract = typeof interfacesContract;
