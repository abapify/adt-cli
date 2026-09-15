/**
 * SOTS (OTR Texts) handler for abapGit format
 */

import { sots } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type OtrTextLike = {
  name: string;
  concept?: string;
  language?: string;
  texts?: Array<{
    langu?: string;
    object?: string;
    lfdNum?: string;
    text?: string;
  }>;
};

export const otrTextHandler = createHandler<OtrTextLike, typeof sots>('SOTS', {
  schema: sots,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SOTS',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<OtrTextLike>(raw);
    return {
      SOTS: {
        item: [
          {
            HEADER: {
              CONCEPT: obj.concept ?? String(obj.name ?? '').toUpperCase(),
              CREA_LAN: isoToSapLang(obj.language),
            },
            ENTRIES: obj.texts?.length
              ? {
                  item: obj.texts.map((t) => ({
                    CONCEPT:
                      obj.concept ?? String(obj.name ?? '').toUpperCase(),
                    LANGU: isoToSapLang(t.langu ?? obj.language),
                    OBJECT: t.object,
                    LFD_NUM: t.lfdNum,
                    TEXT: t.text,
                  })),
                }
              : undefined,
          },
        ],
      },
    };
  },

  fromAbapGit: ({ SOTS }) => {
    const items = normalizeItems(SOTS?.item);
    const first = items[0];
    const entries = normalizeItems(first?.ENTRIES?.item);
    return {
      name: (first?.HEADER?.CONCEPT ?? '').toUpperCase(),
      concept: first?.HEADER?.CONCEPT,
      language: sapLangToIso(first?.HEADER?.CREA_LAN),
      texts: mapItems(entries, (e) => ({
        langu: sapLangToIso(e.LANGU),
        object: e.OBJECT,
        lfdNum: e.LFD_NUM,
        text: e.TEXT,
      })),
    };
  },
});
