/**
 * ADT OO Classes Contract
 *
 * Endpoint: /sap/bc/adt/oo/classes
 * Full CRUD operations for ABAP classes including source code management.
 *
 * Uses the crud() helper with sources and includes options for complete
 * class operations including metadata, source code, and class includes.
 */

import { crud } from '../../base';
import { classes as classesSchema, type InferTypedSchema } from '../../schemas';

/**
 * Include types for ABAP classes
 * Based on AbapClassIncludeType from SAP XSD schema
 */
export type ClassIncludeType =
  | 'main'
  | 'definitions'
  | 'implementations'
  | 'macros'
  | 'testclasses'
  | 'localtypes';

/**
 * Class response type - exported for consumers (ADK, etc.)
 *
 * This is the canonical type for class metadata.
 * Uses pre-generated type from adt-schemas.
 */
export type ClassResponse = InferTypedSchema<typeof classesSchema>;

/**
 * /sap/bc/adt/oo/classes
 * Full CRUD operations for ABAP classes
 *
 * Includes:
 * - Basic CRUD: get, post, put, delete
 * - Lock/Unlock: lock, unlock
 * - Object structure: objectstructure
 * - Source code: source.main.get/put
 * - Class includes: includes.{definitions,implementations,macros,testclasses,localtypes}.get/put
 */
export const classesContract = crud({
  basePath: '/sap/bc/adt/oo/classes',
  schema: classesSchema,
  contentType: 'application/vnd.sap.adt.oo.classes.v4+xml',
  sources: ['main'] as const,
  includes: [
    'definitions',
    'implementations',
    'macros',
    'testclasses',
    'localtypes',
  ] as const,
});

/** Type alias for the classes contract */
export type ClassesContract = typeof classesContract;
