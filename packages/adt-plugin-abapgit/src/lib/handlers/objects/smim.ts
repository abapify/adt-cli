/**
 * SMIM (MIME Repository Object) handler for abapGit format
 *
 * MIME objects have an XML metadata file plus an optional binary
 * companion file `{name}.smim.{filename}` for non-folder objects
 * (upstream build_filename: obj_name.obj_type.filename).
 */

import { smim } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';
import { formatAbapGitXml } from '../xml-format';

type MimeObjectLike = {
  name: string;
  url?: string;
  isFolder?: boolean;
  class?: string;
  fileName?: string;
  mimeType?: string;
  description?: string;
  parentFolderId?: string;
  /** Binary payload (base64) for non-folder MIME objects */
  content?: string;
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

    serialize: async (obj, ctx) => {
      const objectName = ctx.getObjectName(obj);
      const files = [
        ctx.createFile(
          `${objectName}.smim.xml`,
          formatAbapGitXml(ctx.toAbapGitXml(obj)),
        ),
      ];
      if (obj.content && obj.fileName) {
        files.push(
          ctx.createFile(
            `${objectName}.smim.${obj.fileName.toLowerCase()}`,
            obj.content,
            'base64',
          ),
        );
      }
      return files;
    },

    // Binary companion {name}.smim.{filename} is collected as a source
    // during deserialization (base64-encoded by the deserializer).
    setSources: (obj, sources) => {
      const data = unwrapData<Record<string, unknown>>(obj);
      for (const [fileName, content] of Object.entries(sources)) {
        data.fileName = data.fileName ?? fileName;
        data.content = content;
      }
    },

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
