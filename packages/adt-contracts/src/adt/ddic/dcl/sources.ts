/**
 * ADT CDS DCL (Access Control) Source Contract
 *
 * Endpoint: /sap/bc/adt/acm/dcl/sources
 *   (Note: the SAP endpoint for DCL sources lives under `acm/dcl`, not
 *   `ddic/dcl`. The contract is exported under `ddic.dcl` for API
 *   parity with the ADK and the sibling DDL contract.)
 * Content-Type: application/vnd.sap.adt.acm.dcl.source.v1+xml
 * Object type: DCLS
 */

import { crud } from '../../../helpers/crud';
import {
  dclSource as dclSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export type DclSourceResponse = InferTypedSchema<typeof dclSourceSchema>;

export const dclSourcesContract = crud({
  basePath: '/sap/bc/adt/acm/dcl/sources',
  schema: dclSourceSchema,
  contentType: 'application/vnd.sap.adt.acm.dcl.source.v1+xml',
  accept: 'application/vnd.sap.adt.acm.dcl.source.v1+xml',
  sources: ['main'] as const,
});

export type DclSourcesContract = typeof dclSourcesContract;
