/**
 * CUS0 (IMG Activity) handler for abapGit format
 */

import { cus0 } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type ImgActivityLike = {
  name: string;
  docuId?: string;
  attributes?: string;
  cActivity?: string;
  tcode?: string;
  texts?: Array<{ language?: string; text?: string }>;
};

export const imgActivityHandler = createHandler<ImgActivityLike, typeof cus0>(
  'CUS0',
  {
    schema: cus0,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_CUS0',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<ImgActivityLike>(raw);
      return {
        CUS0: {
          HEADER: {
            ACTIVITY: String(obj.name ?? '').toUpperCase(),
            DOCU_ID: obj.docuId,
            ATTRIBUTES: obj.attributes,
            C_ACTIVITY: obj.cActivity,
            TCODE: obj.tcode,
          },
          TEXTS: obj.texts?.length
            ? {
                item: obj.texts.map((t) => ({
                  SPRAS: isoToSapLang(t.language),
                  TEXT: t.text,
                })),
              }
            : undefined,
        },
      };
    },

    fromAbapGit: ({ CUS0 }) => {
      const texts = normalizeItems(CUS0?.TEXTS?.item);
      return {
        name: (CUS0?.HEADER?.ACTIVITY ?? '').toUpperCase(),
        docuId: CUS0?.HEADER?.DOCU_ID,
        attributes: CUS0?.HEADER?.ATTRIBUTES,
        cActivity: CUS0?.HEADER?.C_ACTIVITY,
        tcode: CUS0?.HEADER?.TCODE,
        texts: mapItems(texts, (t) => ({
          language: sapLangToIso(t.SPRAS),
          text: t.TEXT,
        })),
      };
    },
  },
);
