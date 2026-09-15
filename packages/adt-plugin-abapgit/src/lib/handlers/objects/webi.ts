/**
 * WEBI (Web Service / Virtual Endpoint) handler for abapGit format
 */

import { webi } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type WebiLike = {
  name: string;
  description?: string;
  language?: string;
  headers?: Array<{ generator?: string; features?: string }>;
};

export const webiHandler = createHandler<WebiLike, typeof webi>('WEBI', {
  schema: webi,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_WEBI',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<WebiLike>(raw);
    return {
      WEBI: {
        VEPTEXT: {
          VEPNAME: String(obj.name ?? '').toUpperCase(),
          DESCRIPT: obj.description,
          LANGU: isoToSapLang(obj.language),
        },
        PVEPHEADER: obj.headers?.length
          ? {
              item: obj.headers.map((h) => ({
                VEPNAME: String(obj.name ?? '').toUpperCase(),
                GENERATOR: h.generator,
                FEATURES: h.features,
              })),
            }
          : undefined,
      },
    };
  },

  fromAbapGit: ({ WEBI }) => {
    const headers = normalizeItems(WEBI?.PVEPHEADER?.item);
    return {
      name: (WEBI?.VEPTEXT?.VEPNAME ?? '').toUpperCase(),
      description: WEBI?.VEPTEXT?.DESCRIPT,
      language: sapLangToIso(WEBI?.VEPTEXT?.LANGU),
      headers: mapItems(headers, (h) => ({
        generator: h.GENERATOR,
        features: h.FEATURES,
      })),
    };
  },
});
