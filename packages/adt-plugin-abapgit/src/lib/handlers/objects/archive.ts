/**
 * Shared archive metadata mapping for IARP/IASP handlers
 *
 * Both types serialize identical ATTR + PARAMETERS structures;
 * the only difference is the object type and generated schema.
 */

import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import type { AbapGitSchema } from '../abapgit-schema';

type ArchiveLike = {
  name: string;
  packageName?: string;
  version?: string;
  parameters?: Array<{ name?: string; value?: string }>;
};

type ArchiveValues = {
  ATTR?: { NAME?: string; DEVCLASS?: string; VERSION?: string };
  PARAMETERS?: {
    item?:
      | { NAME?: string; VALUE?: string }
      | Array<{ NAME?: string; VALUE?: string }>;
  };
};

export function createArchiveHandler<
  TSchema extends AbapGitSchema<unknown, ArchiveValues>,
>(type: string, schema: TSchema) {
  return createHandler<ArchiveLike, TSchema>(type, {
    schema,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<ArchiveLike>(raw);
      return {
        ATTR: {
          NAME: String(obj.name ?? '').toUpperCase(),
          DEVCLASS: obj.packageName,
          VERSION: obj.version,
        },
        PARAMETERS: obj.parameters?.length
          ? {
              item: obj.parameters.map((p) => ({
                NAME: p.name,
                VALUE: p.value,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({ ATTR, PARAMETERS }) => {
      const params = normalizeItems(PARAMETERS?.item);
      return {
        name: (ATTR?.NAME ?? '').toUpperCase(),
        packageName: ATTR?.DEVCLASS,
        version: ATTR?.VERSION,
        parameters: mapItems(params, (p) => ({ name: p.NAME, value: p.VALUE })),
      };
    },
  });
}
