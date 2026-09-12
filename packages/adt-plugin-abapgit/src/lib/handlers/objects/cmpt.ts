/**
 * CMPT (Composite Template) handler for abapGit format
 */

import { cmpt } from '../../../schemas/generated';
import { createHandler } from '../base';

type CompositeTemplateLike = {
  name: string;
  description?: string;
};

export const compositeTemplateHandler = createHandler<CompositeTemplateLike, typeof cmpt>(
  'CMPT',
  {
    schema: cmpt,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_CMPT',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      CMPT: {
        HEADER: {
          NAME: String(obj.name ?? '').toUpperCase(),
          DESCRIPTION: obj.description,
        },
      },
    }),

    fromAbapGit: ({ CMPT }) => ({
      name: (CMPT?.HEADER?.NAME ?? '').toUpperCase(),
      description: CMPT?.HEADER?.DESCRIPTION,
    }),
  },
);
