/**
 * IAXU (Internet Application XML Template) handler for abapGit format
 */

import { iaxu } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';

type IaxuLike = {
  name: string;
  text?: string;
  mimeType?: string;
  packageName?: string;
};

export const iaxuHandler = createHandler<IaxuLike, typeof iaxu>('IAXU', {
  schema: iaxu,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_IAXU',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<IaxuLike>(raw);
    return {
      ATTR: {
        NAME: String(obj.name ?? '').toUpperCase(),
        TEXT: obj.text,
        MIMETYPE: obj.mimeType,
        DEVCLASS: obj.packageName,
      },
    };
  },

  fromAbapGit: ({ ATTR }) => ({
    name: (ATTR?.NAME ?? '').toUpperCase(),
    text: ATTR?.TEXT,
    mimeType: ATTR?.MIMETYPE,
    packageName: ATTR?.DEVCLASS,
  }),
});
