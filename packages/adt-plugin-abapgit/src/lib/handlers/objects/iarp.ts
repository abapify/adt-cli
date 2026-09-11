/**
 * IARP (Archive Object) handler for abapGit format
 */

import { iarp } from '../../../schemas/generated';
import { createHandler } from '../base';

type ArchiveObjectLike = {
  name: string;
  packageName?: string;
  version?: string;
  parameters?: Array<{ name?: string; value?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const archiveObjectHandler = createHandler<ArchiveObjectLike, typeof iarp>(
  'IARP',
  {
    schema: iarp,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_IARP',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      ATTR: {
        NAME: String(obj.name ?? '').toUpperCase(),
        DEVCLASS: obj.packageName,
        VERSION: obj.version,
      },
      PARAMETERS: obj.parameters?.length
        ? { item: obj.parameters.map((p) => ({ NAME: p.name, VALUE: p.value })) }
        : undefined,
    }),

    fromAbapGit: ({ ATTR, PARAMETERS }) => {
      const params = normalizeItems(PARAMETERS?.item);
      return {
        name: (ATTR?.NAME ?? '').toUpperCase(),
        packageName: ATTR?.DEVCLASS,
        version: ATTR?.VERSION,
        parameters: params.map((p) => ({ name: p.NAME, value: p.VALUE })),
      };
    },
  },
);
