import { crud } from '../../../helpers/crud';
import {
  blueSource as blueSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export type DsfdSourceResponse = InferTypedSchema<typeof blueSourceSchema>;

export const dsfdSourcesContract = crud({
  basePath: '/sap/bc/adt/ddic/dsfd/sources',
  schema: blueSourceSchema,
  contentType: 'application/vnd.sap.adt.blues.v1+xml',
  accept: 'application/vnd.sap.adt.blues.v1+xml',
  nameTransform: (name) => encodeURIComponent(name.toLowerCase()),
  sources: ['main'] as const,
});
