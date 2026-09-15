/**
 * CUS1 (Customizing Activity) handler for abapGit format
 */

import { cus1 } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type CustomizingActivityLike = {
  name: string;
  actType?: string;
  titles?: Array<{ language?: string; text?: string }>;
};

export const customizingActivityHandler = createHandler<
  CustomizingActivityLike,
  typeof cus1
>('CUS1', {
  schema: cus1,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_CUS1',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    CUS1: {
      ACTIVITY_HEADER: {
        ACT_ID: String(obj.name ?? '').toUpperCase(),
        ACT_TYPE: obj.actType,
      },
      ACTIVITY_TITLE: obj.titles?.length
        ? {
            item: obj.titles.map((t) => ({
              ACT_ID: String(obj.name ?? '').toUpperCase(),
              SPRAS: isoToSapLang(t.language),
              TEXT: t.text,
            })),
          }
        : undefined,
    },
  }),

  fromAbapGit: ({ CUS1 }) => {
    const titles = normalizeItems(CUS1?.ACTIVITY_TITLE?.item);
    return {
      name: (CUS1?.ACTIVITY_HEADER?.ACT_ID ?? '').toUpperCase(),
      actType: CUS1?.ACTIVITY_HEADER?.ACT_TYPE,
      titles: mapItems(titles, (t) => ({
        language: sapLangToIso(t.SPRAS),
        text: t.TEXT,
      })),
    };
  },
});
