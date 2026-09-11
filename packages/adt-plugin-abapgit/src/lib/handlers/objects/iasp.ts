/**
 * IASP (Archive Path / Service) handler for abapGit format
 */

import { iasp } from '../../../schemas/generated';
import { createHandler } from '../base';

type ArchivePathLike = {
  name: string;
  packageName?: string;
  version?: string;
  parameters?: Array<{ name?: string; value?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const archivePathHandler = createHandler<ArchivePathLike, typeof iasp>(
  'IASP',
  {
    schema: iasp,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_IASP',
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
