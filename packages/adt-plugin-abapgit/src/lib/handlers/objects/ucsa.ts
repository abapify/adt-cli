/**
 * UCSA (Unit Case / Communication Assembly) handler for abapGit format
 */

import { ucsa } from '../../../schemas/generated';
import { createHandler } from '../base';

type UnitCaseLike = {
  name: string;
  id?: string;
  description?: string;
};

export const unitCaseHandler = createHandler<UnitCaseLike, typeof ucsa>(
  'UCSA',
  {
    schema: ucsa,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_UCSA',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      UCSA: {
        HEADER: {
          ID: obj.id ?? String(obj.name ?? '').toUpperCase(),
          DESCRIPTION: obj.description,
        },
      },
    }),

    fromAbapGit: ({ UCSA }) => ({
      name: (UCSA?.HEADER?.ID ?? '').toUpperCase(),
      id: UCSA?.HEADER?.ID,
      description: UCSA?.HEADER?.DESCRIPTION,
    }),
  },
);
