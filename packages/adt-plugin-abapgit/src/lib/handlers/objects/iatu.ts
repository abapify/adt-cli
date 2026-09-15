/**
 * IATU (Internet Application HTML Template) handler for abapGit format
 *
 * Upstream stores the HTML source in a {name}.iatu.html side file
 * (mo_files->add_string iv_ext='html'); this handler covers the
 * ATTR metadata XML plus the HTML companion.
 */

import { iatu } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';
import { formatAbapGitXml } from '../xml-format';

type IatuLike = {
  name: string;
  text?: string;
  mimeType?: string;
  packageName?: string;
  /** HTML template source stored in {name}.iatu.html */
  html?: string;
};

export const iatuHandler = createHandler<IatuLike, typeof iatu>('IATU', {
  schema: iatu,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_IATU',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<IatuLike>(raw);
    return {
      ATTR: {
        NAME: String(obj.name ?? '').toUpperCase(),
        TEXT: obj.text,
        MIMETYPE: obj.mimeType,
        DEVCLASS: obj.packageName,
      },
    };
  },

  serialize: async (raw, ctx) => {
    const obj = unwrapData<IatuLike>(raw);
    const objectName = ctx.getObjectName(obj);
    const files = [
      ctx.createFile(
        `${objectName}.iatu.xml`,
        formatAbapGitXml(ctx.toAbapGitXml(obj)),
      ),
    ];
    if (obj.html) {
      files.push(ctx.createFile(`${objectName}.iatu.html`, obj.html));
    }
    return files;
  },

  // {name}.iatu.html is collected as a binary source during
  // deserialization (base64-encoded by the deserializer).
  setSources: (obj, sources) => {
    const data = unwrapData<Record<string, unknown>>(obj);
    for (const [, content] of Object.entries(sources)) {
      data.html = Buffer.from(content, 'base64').toString('utf-8');
    }
  },

  fromAbapGit: ({ ATTR }) => ({
    name: (ATTR?.NAME ?? '').toUpperCase(),
    text: ATTR?.TEXT,
    mimeType: ATTR?.MIMETYPE,
    packageName: ATTR?.DEVCLASS,
  }),
});
