/**
 * CUS0 (IMG Activity) handler for abapGit format
 */

import { cus0 } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type ImgActivityLike = {
  name: string;
  docuId?: string;
  attributes?: string;
  cActivity?: string;
  tcode?: string;
  texts?: Array<{ language?: string; text?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const imgActivityHandler = createHandler<ImgActivityLike, typeof cus0>(
  'CUS0',
  {
    schema: cus0,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_CUS0',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      CUS0: {
        HEADER: {
          ACTIVITY: String(obj.name ?? '').toUpperCase(),
          DOCU_ID: obj.docuId,
          ATTRIBUTES: obj.attributes,
          C_ACTIVITY: obj.cActivity,
          TCODE: obj.tcode,
        },
        TEXTS: obj.texts?.length
          ? { item: obj.texts.map((t) => ({
              SPRAS: isoToSapLang(t.language),
              TEXT: t.text,
            })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ CUS0 }) => {
      const texts = normalizeItems(CUS0?.TEXTS?.item);
      return {
        name: (CUS0?.HEADER?.ACTIVITY ?? '').toUpperCase(),
        docuId: CUS0?.HEADER?.DOCU_ID,
        attributes: CUS0?.HEADER?.ATTRIBUTES,
        cActivity: CUS0?.HEADER?.C_ACTIVITY,
        tcode: CUS0?.HEADER?.TCODE,
        texts: texts.map((t) => ({
          language: sapLangToIso(t.SPRAS),
          text: t.TEXT,
        })),
      };
    },
  },
);
