/**
 * OTGR (Object Type Group) handler for abapGit format
 */

import { otgr } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type ObjectTypeGroupLike = {
  name: string;
  type?: string;
  texts?: Array<{ language?: string; text?: string }>;
  elements?: Array<{ objType?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const objectTypeGroupHandler = createHandler<ObjectTypeGroupLike, typeof otgr>(
  'OTGR',
  {
    schema: otgr,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_OTGR',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      OTGR: {
        CLS_TYPE_GROUP: {
          NAME: String(obj.name ?? '').toUpperCase(),
          TYPE: obj.type,
        },
        TEXTS: obj.texts?.length
          ? { item: obj.texts.map((t) => ({
              SPRAS: isoToSapLang(t.language),
              NAME: String(obj.name ?? '').toUpperCase(),
              TEXT: t.text,
            })) }
          : undefined,
        ELEMENTS: obj.elements?.length
          ? { item: obj.elements.map((e) => ({
              OBJ_TYPE_GROUP: String(obj.name ?? '').toUpperCase(),
              OBJ_TYPE: e.objType,
            })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ OTGR }) => {
      const texts = normalizeItems(OTGR?.TEXTS?.item);
      const elements = normalizeItems(OTGR?.ELEMENTS?.item);
      return {
        name: (OTGR?.CLS_TYPE_GROUP?.NAME ?? '').toUpperCase(),
        type: OTGR?.CLS_TYPE_GROUP?.TYPE,
        texts: texts.map((t) => ({
          language: sapLangToIso(t.SPRAS),
          text: t.TEXT,
        })),
        elements: elements.map((e) => ({ objType: e.OBJ_TYPE })),
      };
    },
  },
);
