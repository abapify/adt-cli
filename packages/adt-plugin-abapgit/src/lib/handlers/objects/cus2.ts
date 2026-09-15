/**
 * CUS2 (Customizing Attribute) handler for abapGit format
 */

import { cus2 } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type CustomizingAttributeLike = {
  name: string;
  attrType?: string;
  titles?: Array<{ language?: string; text?: string }>;
};

export const customizingAttributeHandler = createHandler<
  CustomizingAttributeLike,
  typeof cus2
>('CUS2', {
  schema: cus2,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_CUS2',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    CUS2: {
      HEADER: {
        ATTR_ID: String(obj.name ?? '').toUpperCase(),
        ATTR_TYPE: obj.attrType,
      },
      TITLES: obj.titles?.length
        ? {
            item: obj.titles.map((t) => ({
              ATTR_ID: String(obj.name ?? '').toUpperCase(),
              SPRAS: isoToSapLang(t.language),
              TEXT: t.text,
            })),
          }
        : undefined,
    },
  }),

  fromAbapGit: ({ CUS2 }) => {
    const titles = normalizeItems(CUS2?.TITLES?.item);
    return {
      name: (CUS2?.HEADER?.ATTR_ID ?? '').toUpperCase(),
      attrType: CUS2?.HEADER?.ATTR_TYPE,
      titles: mapItems(titles, (t) => ({
        language: sapLangToIso(t.SPRAS),
        text: t.TEXT,
      })),
    };
  },
});
