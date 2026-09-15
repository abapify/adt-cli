/**
 * APIS (API Release State) handler for abapGit format
 */

import { apis } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';

type ApiStateLike = {
  name: string;
  description?: string;
};

export const apiStateHandler = createHandler<ApiStateLike, typeof apis>(
  'APIS',
  {
    schema: apis,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_APIS',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<ApiStateLike>(raw);
      return {
        APIS: {
          HEADER: {
            API_NAME: String(obj.name ?? '').toUpperCase(),
            DESCRIPTION: obj.description,
          },
        },
      };
    },

    fromAbapGit: ({ APIS }) => ({
      name: (APIS?.HEADER?.API_NAME ?? '').toUpperCase(),
      description: APIS?.HEADER?.DESCRIPTION,
    }),
  },
);
