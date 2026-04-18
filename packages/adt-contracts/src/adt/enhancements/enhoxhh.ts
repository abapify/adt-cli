/**
 * ADT BAdI / Enhancement Implementation (ENHO) Contract
 *
 * Endpoints:
 *   /sap/bc/adt/enhancements/enhoxhh/{name}
 *   /sap/bc/adt/enhancements/enhoxhh/{name}/source/main
 *
 * Object type: ENHO/XHH   (enhancement implementation, BAdI container)
 * Content-Type: application/vnd.sap.adt.enhancements.enhoxhh.v1+xml
 *
 * SAP wraps the enhancement implementation in an
 * `enh:enhancementImplementation` element extending
 * `adtcore:AdtMainObject`. The BAdI implementations themselves live
 * inside the text payload served via `source/main`.
 *
 * The full XSD at `packages/adt-schemas/.xsd/sap/enhancements.xsd`
 * models the heavyweight emf tree (sourceCodePlugin, BAdI entries,
 * etc.). For CLI / MCP use we only need the AdtMainObject envelope —
 * same pattern as bdef's `blueSource` wrapper.
 *
 * sapcli reference: `sap/cli/badi.py`. In sapcli, `sap badi` lists the
 * BAdIs carried by a given Enhancement Implementation name (`-i` flag).
 */

import { crud } from '../../helpers/crud';
import { badi as badiSchema, type InferTypedSchema } from '../../schemas';

/** BAdI (ENHO) GET response shape. */
export type BadiResponse = InferTypedSchema<typeof badiSchema>;

/**
 * /sap/bc/adt/enhancements/enhoxhh
 *
 * CRUD + lock/unlock + source/main (`/source/main` text body).
 */
export const enhoxhhContract = crud({
  basePath: '/sap/bc/adt/enhancements/enhoxhh',
  schema: badiSchema,
  contentType: 'application/vnd.sap.adt.enhancements.enhoxhh.v1+xml',
  accept: 'application/vnd.sap.adt.enhancements.enhoxhh.v1+xml',
  sources: ['main'] as const,
});

/** Type alias for the BAdI/ENHO contract */
export type EnhoxhhContract = typeof enhoxhhContract;
