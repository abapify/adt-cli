/**
 * ADT Programs Contract
 *
 * Endpoint: /sap/bc/adt/programs/programs
 * Full CRUD operations for ABAP programs including source code management.
 */

import { crud } from '../../base';
import { programs, type InferTypedSchema } from '../../schemas';

/**
 * Program response type - exported for consumers (ADK, etc.)
 *
 * This is the canonical type for program metadata.
 * Uses pre-generated type from adt-schemas.
 */
export type ProgramResponse = InferTypedSchema<typeof programs>;

/**
 * /sap/bc/adt/programs/programs
 * Full CRUD operations for ABAP programs
 *
 * Includes:
 * - Basic CRUD: get, post, put, delete
 * - Lock/Unlock: lock, unlock
 * - Object structure: objectstructure
 * - Source code: source.main.get/put
 */
export const programsContract = crud({
  basePath: '/sap/bc/adt/programs/programs',
  schema: programs,
  contentType: 'application/vnd.sap.adt.programs.programs.v2+xml',
  accept:
    'application/vnd.sap.adt.programs.programs.v2+xml, application/vnd.sap.adt.programs.programs.v1+xml',
  sources: ['main'] as const,
});

/** Type alias for the programs contract */
export type ProgramsContract = typeof programsContract;
