/**
 * ACID (Acid Object) handler for abapGit format
 */

import { acid } from '../../../schemas/generated';
import { createHandler } from '../base';

type AcidObjectLike = {
  name: string;
  description?: string;
};

export const acidHandler = createHandler<AcidObjectLike, typeof acid>(
  'ACID',
  {
    schema: acid,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_ACID',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      DESCRIPTION: obj.description,
    }),

    fromAbapGit: ({ DESCRIPTION }) => ({
      name: '',
      description: DESCRIPTION,
    }),
  },
);
