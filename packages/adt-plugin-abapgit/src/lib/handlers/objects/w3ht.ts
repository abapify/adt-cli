/**
 * W3HT (W3 HTML Template) handler for abapGit format
 *
 * Upstream stores the HTML payload in a separate binary side file
 * ({name}.w3ht.data.{ext}); this handler covers the NAME/TEXT/PARAMS
 * metadata XML.
 */

import { w3ht } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type W3TemplateLike = {
  name: string;
  text?: string;
  params?: Array<{ name?: string; value?: string }>;
};

export const w3htHandler = createHandler<W3TemplateLike, typeof w3ht>('W3HT', {
  schema: w3ht,
  version: 'v2.0.0',
  serializer: 'LCL_OBJECT_W3HT',
  serializer_version: 'v2.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<W3TemplateLike>(raw);
    return {
      NAME: String(obj.name ?? '').toUpperCase(),
      TEXT: obj.text,
      PARAMS: obj.params?.length
        ? {
            item: obj.params.map((p) => ({
              OBJID: String(obj.name ?? '').toUpperCase(),
              NAME: p.name,
              VALUE: p.value,
            })),
          }
        : undefined,
    };
  },

  fromAbapGit: ({ NAME, TEXT, PARAMS }) => {
    const params = normalizeItems(PARAMS?.item);
    return {
      name: (NAME ?? '').toUpperCase(),
      text: TEXT,
      params: mapItems(params, (p) => ({ name: p.NAME, value: p.VALUE })),
    };
  },
});
