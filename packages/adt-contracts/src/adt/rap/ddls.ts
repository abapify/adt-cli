/**
 * ADT RAP CDS View/Entity Contract
 *
 * Endpoint: /sap/bc/adt/ddl/ddls
 *
 * CDS Views and View Entities are core RAP data sources.
 * DDLS (Data Definition Language Source) objects define:
 * - CDS Views: define projection views on database tables
 * - View Entities: RAP-managed CDS views with behavior
 *
 * This contract handles CRUD operations for all DDLS objects,
 * including RAP-managed ones that have behavior definitions.
 *
 * Note: While DDLS is the generic DDL endpoint, RAP-managed
 * CDS objects are specifically identified by their type
 * (e.g., zrap_c_view for managed view entities).
 */

import { crud } from '../../base';
import { classes as classesSchema } from '../../schemas';

export const ddlsContract = crud({
  basePath: '/sap/bc/adt/ddl/ddls',
  schema: classesSchema,
  contentType: 'application/vnd.sap.adt.ddl.ddlsource.v2+xml',
  accept:
    'application/vnd.sap.adt.ddl.ddlsource.v2+xml, application/vnd.sap.adt.ddl.ddlsource.v1+xml, application/vnd.sap.adt.ddl.ddlsource+xml',
  sources: ['main'] as const,
});

export type DdlsContract = typeof ddlsContract;
