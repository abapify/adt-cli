/**
 * MSAG (Message Class) object handler for abapGit format
 *
 * Message classes are XML-only (no source code). The abapGit format stores
 * the class header in T100A and the individual message lines in the T100
 * table (wrapped in <item> elements).
 */

import { msag } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type MessageClassLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  messages?: Array<{
    number?: string;
    text?: string;
    language?: string;
  }>;
};

export const messageClassHandler = createHandler<MessageClassLike, typeof msag>(
  'MSAG',
  {
    schema: msag,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_MSAG',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const messages = obj.messages ?? [];
      return {
        T100A: {
          ARBGB: String(obj.name ?? '').toUpperCase(),
          MASTERLANG: isoToSapLang(obj.masterLanguage || obj.language),
          STEXT: obj.description ?? '',
        },
        T100:
          messages.length > 0
            ? {
                item: messages.map((m) => ({
                  SPRSL: isoToSapLang(
                    m.language || obj.masterLanguage || obj.language,
                  ),
                  ARBGB: String(obj.name ?? '').toUpperCase(),
                  MSGNR: String(m.number ?? '').padStart(3, '0'),
                  TEXT: m.text ?? '',
                })),
              }
            : undefined,
      };
    },

    fromAbapGit: ({ T100A, T100 }) => {
      const rawItems = T100?.item ?? [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];
      return {
        name: (T100A?.ARBGB ?? '').toUpperCase(),
        type: 'MSAG/MS',
        description: T100A?.STEXT,
        language: sapLangToIso(T100A?.MASTERLANG),
        masterLanguage: sapLangToIso(T100A?.MASTERLANG),
        messages: items.map((m) => ({
          number: m.MSGNR ?? '',
          text: m.TEXT ?? '',
          language: sapLangToIso(m.SPRSL),
        })),
      } as { name: string } & Record<string, unknown>;
    },
  },
);
