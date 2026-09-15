/**
 * XSLT (Transformation) object handler for abapGit format
 *
 * Transformations have both XML metadata (XSLT structure) and ABAP source
 * (<name>.xslt.abap). The abapGit format stores the header in XSLT.
 */

import { xslt } from '../../../schemas/generated';
import { createHandler } from '../base';

type TransformationLike = {
  name: string;
  description?: string;
  getSource?: () => Promise<string> | string;
};

export const transformationHandler = createHandler<
  TransformationLike,
  typeof xslt
>('XSLT', {
  schema: xslt,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_XSLT',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    XSLT: {
      PROGNAME: String(obj.name ?? '').toUpperCase(),
      DESCRIPT: obj.description ?? '',
    },
  }),

  getSource: (obj) =>
    typeof obj?.getSource === 'function'
      ? Promise.resolve(obj.getSource())
      : Promise.resolve(''),

  fromAbapGit: ({ XSLT }) => ({
    name: (XSLT?.PROGNAME ?? '').toUpperCase(),
    type: 'XSLT/TX',
    description: XSLT?.DESCRIPT,
  }),

  setSources: (obj, sources) => {
    if (sources.main) {
      (obj as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
