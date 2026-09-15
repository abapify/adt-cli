import { crud } from '../../../helpers/crud';
import {
  ddlxSource as ddlxSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export type DdlxSourceResponse = InferTypedSchema<typeof ddlxSourceSchema>;
export const ddlxSourcesContract = crud({
  basePath: '/sap/bc/adt/ddic/ddlx/sources',
  schema: ddlxSourceSchema,
  contentType: 'application/vnd.sap.adt.ddic.ddlx.v1+xml',
  accept: 'application/vnd.sap.adt.ddic.ddlx.v1+xml',
  nameTransform: (name) => encodeURIComponent(name.toLowerCase()),
  sources: ['main'] as const,
});
