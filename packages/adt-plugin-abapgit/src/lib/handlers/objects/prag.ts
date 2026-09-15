/**
 * PRAG (Pragma) handler for abapGit format
 */

import { prag } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';

type PragmaLike = {
  name: string;
  extension?: string;
  signature?: string;
  description?: string;
};

export const pragmaHandler = createHandler<PragmaLike, typeof prag>('PRAG', {
  schema: prag,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PRAG',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<PragmaLike>(raw);
    return {
      PRAG: {
        PRAGMA: String(obj.name ?? '').toUpperCase(),
        EXTENSION: obj.extension,
        SIGNATURE: obj.signature,
        DESCRIPTION: obj.description,
      },
    };
  },

  fromAbapGit: ({ PRAG }) => ({
    name: (PRAG?.PRAGMA ?? '').toUpperCase(),
    extension: PRAG?.EXTENSION,
    signature: PRAG?.SIGNATURE,
    description: PRAG?.DESCRIPTION,
  }),
});
