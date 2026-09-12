/**
 * IATU (Internet Application HTML Template) handler for abapGit format
 *
 * Upstream stores the HTML source in a {name}.iatu.html side file;
 * this handler covers the ATTR metadata XML.
 */

import { iatu } from '../../../schemas/generated';
import { createHandler } from '../base';

type IatuLike = {
  name: string;
  text?: string;
  mimeType?: string;
  packageName?: string;
};

export const iatuHandler = createHandler<IatuLike, typeof iatu>(
  'IATU',
  {
    schema: iatu,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_IATU',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      ATTR: {
        NAME: String(obj.name ?? '').toUpperCase(),
        TEXT: obj.text,
        MIMETYPE: obj.mimeType,
        DEVCLASS: obj.packageName,
      },
    }),

    fromAbapGit: ({ ATTR }) => ({
      name: (ATTR?.NAME ?? '').toUpperCase(),
      text: ATTR?.TEXT,
      mimeType: ATTR?.MIMETYPE,
      packageName: ATTR?.DEVCLASS,
    }),
  },
);
