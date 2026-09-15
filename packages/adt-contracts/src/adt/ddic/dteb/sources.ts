import { crud } from '../../../helpers/crud';
import {
  dtebSource as dtebSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export type DtebSourceResponse = InferTypedSchema<typeof dtebSourceSchema>;

export const dtebSourcesContract = crud({
  basePath: '/sap/bc/adt/ddic/dteb/sources',
  schema: dtebSourceSchema,
  contentType: 'application/vnd.sap.adt.ddic.dteb.v1+xml',
  accept: 'application/vnd.sap.adt.ddic.dteb.v1+xml',
  nameTransform: (name) => encodeURIComponent(name.toLowerCase()),
  sources: ['main'] as const,
});
