/**
 * SAPC (APC Application) handler for abapGit format
 */

import { sapc } from '../../../schemas/generated';
import { createHandler } from '../base';

type ApcApplicationLike = {
  name: string;
  description?: string;
};

export const apcApplicationHandler = createHandler<
  ApcApplicationLike,
  typeof sapc
>('SAPC', {
  schema: sapc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SAPC',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    SAPC: {
      HEADER: {
        APC_NAME: String(obj.name ?? '').toUpperCase(),
        DESCRIPT: obj.description,
      },
    },
  }),

  fromAbapGit: ({ SAPC }) => ({
    name: (SAPC?.HEADER?.APC_NAME ?? '').toUpperCase(),
    description: SAPC?.HEADER?.DESCRIPT,
  }),
});
