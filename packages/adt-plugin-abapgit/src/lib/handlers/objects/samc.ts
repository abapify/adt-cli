/**
 * SAMC (AMC Application) handler for abapGit format
 */

import { samc } from '../../../schemas/generated';
import { createHandler } from '../base';

type AmcApplicationLike = {
  name: string;
  description?: string;
};

export const amcApplicationHandler = createHandler<
  AmcApplicationLike,
  typeof samc
>('SAMC', {
  schema: samc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SAMC',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    SAMC: {
      HEADER: {
        AMC_NAME: String(obj.name ?? '').toUpperCase(),
        DESCRIPT: obj.description,
      },
    },
  }),

  fromAbapGit: ({ SAMC }) => ({
    name: (SAMC?.HEADER?.AMC_NAME ?? '').toUpperCase(),
    description: SAMC?.HEADER?.DESCRIPT,
  }),
});
