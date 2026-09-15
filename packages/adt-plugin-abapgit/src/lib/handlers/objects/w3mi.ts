/**
 * W3MI (W3 MIME Object) handler for abapGit format
 *
 * Upstream stores the binary payload in a separate side file
 * ({name}.w3mi.data.{ext}); this handler covers the NAME/TEXT/PARAMS
 * metadata XML.
 */

import { w3mi } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type W3MimeLike = {
  name: string;
  text?: string;
  params?: Array<{ name?: string; value?: string }>;
};

export const w3miHandler = createHandler<W3MimeLike, typeof w3mi>('W3MI', {
  schema: w3mi,
  version: 'v2.0.0',
  serializer: 'LCL_OBJECT_W3MI',
  serializer_version: 'v2.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<W3MimeLike>(raw);
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
