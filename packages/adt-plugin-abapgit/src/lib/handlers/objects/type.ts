/**
 * TYPE (Type Group / Type Pool) object handler for abapGit format
 *
 * Type groups have both XML metadata (TYPE structure) and ABAP source
 * (<name>.type.abap). The abapGit format stores the header in TYPE.
 */

import { type as typeSchema } from '../../../schemas/generated';
import { createHandler } from '../base';

type TypeGroupLike = {
  name: string;
  description?: string;
  getSource?: () => Promise<string> | string;
};

export const typeGroupHandler = createHandler<TypeGroupLike, typeof typeSchema>(
  'TYPE',
  {
    schema: typeSchema,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_TYPE',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      TYPE: {
        TYPEGROUP: String(obj.name ?? '').toUpperCase(),
        DESCRIPT: obj.description ?? '',
      },
    }),

    getSource: (obj) =>
      typeof obj?.getSource === 'function'
        ? Promise.resolve(obj.getSource())
        : Promise.resolve(''),

    fromAbapGit: ({ TYPE }) => ({
      name: (TYPE?.TYPEGROUP ?? '').toUpperCase(),
      type: 'TYPE/TY',
      description: TYPE?.DESCRIPT,
    }),

    setSources: (obj, sources) => {
      if (sources.main) {
        (obj as unknown as { _pendingSource: string })._pendingSource =
          sources.main;
      }
    },
  },
);
