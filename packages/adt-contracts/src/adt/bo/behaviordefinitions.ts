/**
 * ADT Behavior Definition (BDEF) Contract
 *
 * Endpoint: /sap/bc/adt/bo/behaviordefinitions/{name}
 *           /sap/bc/adt/bo/behaviordefinitions/{name}/source/main
 *
 * Object type: BDEF/BDO
 * Content-Type: application/vnd.sap.adt.blues.v1+xml
 *
 * SAP wraps BDEF metadata in the shared `blue:blueSource` wrapper
 * (namespace http://www.sap.com/wbobj/blue) that extends
 * abapsource:AbapSourceMainObject — the same envelope used by
 * DDIC TABL/Structure responses. The BDEF source (`.abdl`) is
 * served as text/plain via `source/main`.
 *
 * Reference: sapcli `sap/adt/objects.py` (class BehaviorDefinition).
 */

import { crud } from '../../helpers/crud';
import {
  blueSource as blueSourceSchema,
  type InferTypedSchema,
} from '../../schemas';

/**
 * BDEF response type — re-used `blueSource` wrapper (same as TABL/STRUCT).
 * Consumers (ADK, MCP, CLI) import this alias instead of blueSource
 * to make the intent explicit.
 */
export type BehaviorDefinitionResponse = InferTypedSchema<
  typeof blueSourceSchema
>;

/**
 * /sap/bc/adt/bo/behaviordefinitions
 * Full CRUD operations for ABAP Behavior Definitions (RAP).
 *
 * Includes:
 *  - Basic CRUD: get, post, put, delete
 *  - Lock/Unlock: lock, unlock
 *  - Object structure: objectstructure
 *  - Source code: source.main.get/put  (text/plain .abdl)
 */
export const behaviordefinitionsContract = crud({
  basePath: '/sap/bc/adt/bo/behaviordefinitions',
  schema: blueSourceSchema,
  contentType: 'application/vnd.sap.adt.blues.v1+xml',
  accept: 'application/vnd.sap.adt.blues.v1+xml',
  sources: ['main'] as const,
});

/** Type alias for the BDEF contract */
export type BehaviordefinitionsContract = typeof behaviordefinitionsContract;
