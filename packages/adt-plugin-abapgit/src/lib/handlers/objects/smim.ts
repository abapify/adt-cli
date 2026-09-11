/**
 * SMIM (MIME Repository Object) handler for abapGit format
 *
 * MIME objects are XML-only with an optional binary companion file.
 * The abapGit format stores URL, FOLDER flag, CLASS, and EXTRA metadata.
 */

import { smim } from '../../../schemas/generated';
import { createHandler } from '../base';

type MimeObjectLike = {
  name: string;
  url?: string;
  isFolder?: boolean;
  class?: string;
  fileName?: string;
  mimeType?: string;
  description?: string;
  parentFolderId?: string;
};

export const mimeObjectHandler = createHandler<MimeObjectLike, typeof smim>(
  'SMIM',
  {
    schema: smim,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SMIM',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      URL: obj.url ?? '',
      FOLDER: obj.isFolder ? 'X' : undefined,
      CLASS: obj.class,
      EXTRA: {
        FILE_NAME: obj.fileName,
        MIMETYPE: obj.mimeType,
        DESCRIPTION: obj.description,
        PARENT_FOLDER_ID: obj.parentFolderId,
      },
    }),

    fromAbapGit: ({ URL, FOLDER, CLASS, EXTRA }) => ({
      name: '',
      url: URL,
      isFolder: FOLDER === 'X',
      class: CLASS,
      fileName: EXTRA?.FILE_NAME,
      mimeType: EXTRA?.MIMETYPE,
      description: EXTRA?.DESCRIPTION,
      parentFolderId: EXTRA?.PARENT_FOLDER_ID,
    }),
  },
);
