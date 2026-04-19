/**
 * ADT Program Includes Contract
 *
 * Endpoint: /sap/bc/adt/programs/includes
 * Full CRUD operations for ABAP program includes (PROG/I) including source
 * code management.
 *
 * Mirrors the shape of `programs.ts` but targets the `/programs/includes`
 * URL space and the `include:abapInclude` XML payload.
 */

import { crud } from '../../base';
import { includes, type InferTypedSchema } from '../../schemas';

/**
 * Include response type - exported for consumers (ADK, MCP, etc.).
 *
 * Uses the pre-generated type from adt-schemas. This is the canonical
 * type for include metadata (wraps `{ abapInclude: ... }`).
 */
export type IncludeResponse = InferTypedSchema<typeof includes>;

/**
 * /sap/bc/adt/programs/includes
 * Full CRUD operations for ABAP program includes
 *
 * Includes:
 * - Basic CRUD: get, post, put, delete
 * - Lock/Unlock: lock, unlock
 * - Object structure: objectstructure
 * - Source code: source.main.get/put
 *
 * Content types follow the same "v2 preferred, v1 fallback" pattern SAP
 * uses for includes (observed from real responses; matches sapcli's
 * `sap.adt.programs.Include` OBJTYPE).
 */
export const includesContract = crud({
  basePath: '/sap/bc/adt/programs/includes',
  schema: includes,
  contentType: 'application/vnd.sap.adt.programs.includes.v2+xml',
  accept:
    'application/vnd.sap.adt.programs.includes.v2+xml, application/vnd.sap.adt.programs.includes.v1+xml, application/vnd.sap.adt.programs.includes+xml',
  sources: ['main'] as const,
});

/** Type alias for the includes contract */
export type IncludesContract = typeof includesContract;
