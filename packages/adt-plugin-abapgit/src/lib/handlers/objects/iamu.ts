/**
 * IAMU (Internet Application MIME Object) handler for abapGit format
 *
 * Upstream v2.0.0 stores the binary payload in a separate side file;
 * this handler covers the IAMU metadata XML.
 */

import { iamu } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';

type IamuLike = {
  name: string;
  text?: string;
  mimeType?: string;
  packageName?: string;
  extension?: string;
};

export const iamuHandler = createHandler<IamuLike, typeof iamu>('IAMU', {
  schema: iamu,
  version: 'v2.0.0',
  serializer: 'LCL_OBJECT_IAMU',
  serializer_version: 'v2.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<IamuLike>(raw);
    return {
      IAMU: {
        ATTRIBUTES: {
          OBJID: String(obj.name ?? '').toUpperCase(),
          TEXT: obj.text,
          MIMETYPE: obj.mimeType,
          DEVCLASS: obj.packageName,
        },
        EXTENSION: obj.extension,
      },
    };
  },

  fromAbapGit: ({ IAMU }) => ({
    name: (IAMU?.ATTRIBUTES?.OBJID ?? '').toUpperCase(),
    text: IAMU?.ATTRIBUTES?.TEXT,
    mimeType: IAMU?.ATTRIBUTES?.MIMETYPE,
    packageName: IAMU?.ATTRIBUTES?.DEVCLASS,
    extension: IAMU?.EXTENSION,
  }),
});
