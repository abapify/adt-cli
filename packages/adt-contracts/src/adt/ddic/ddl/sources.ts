/**
 * ADT CDS DDL Source Contract
 *
 * Endpoint: /sap/bc/adt/ddic/ddl/sources
 * Content-Type: application/vnd.sap.adt.ddl.source.v2+xml
 * Object type: DDLS
 *
 * CDS Data Definition sources — the SAP endpoint for CDS views / data
 * definitions. The metadata document lives at `{basePath}/{name}` and
 * the source text at `{basePath}/{name}/source/main`.
 */

import { crud } from '../../../helpers/crud';
import {
  ddlSource as ddlSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export type DdlSourceResponse = InferTypedSchema<typeof ddlSourceSchema>;

export const ddlSourcesContract = crud({
  basePath: '/sap/bc/adt/ddic/ddl/sources',
  schema: ddlSourceSchema,
  contentType: 'application/vnd.sap.adt.ddl.source.v2+xml',
  accept:
    'application/vnd.sap.adt.ddl.source.v2+xml, application/vnd.sap.adt.ddl.source.v1+xml',
  sources: ['main'] as const,
});

export type DdlSourcesContract = typeof ddlSourcesContract;
