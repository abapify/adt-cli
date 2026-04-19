/**
 * ADT RAP Service Definition (SRVD) Source Contract
 *
 * Endpoint: /sap/bc/adt/ddic/srvd/sources
 * Content-Type: application/vnd.sap.adt.ddic.srvd.v1+xml
 * Object type: SRVD/SRV
 *
 * RAP Service Definition — CDS-like source that exposes CDS root
 * entities/behaviors via OData. Mirrors the DDL sources shape: metadata
 * document at `{basePath}/{name}`, source text (`.asrvd`) at
 * `{basePath}/{name}/source/main`.
 *
 * Reference: abapGit handler zcl_abapgit_object_srvd.
 */

import { crud } from '../../../helpers/crud';
import {
  srvdSource as srvdSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export type SrvdSourceResponse = InferTypedSchema<typeof srvdSourceSchema>;

export const srvdSourcesContract = crud({
  basePath: '/sap/bc/adt/ddic/srvd/sources',
  schema: srvdSourceSchema,
  contentType: 'application/vnd.sap.adt.ddic.srvd.v1+xml',
  accept: 'application/vnd.sap.adt.ddic.srvd.v1+xml',
  sources: ['main'] as const,
});

export type SrvdSourcesContract = typeof srvdSourcesContract;
