/**
 * DOCT (General Text / Longtext) handler for abapGit format
 *
 * Uses the abapGit longtexts helper which serializes a LONGTEXTS structure.
 */

import { doct } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type GeneralTextLike = {
  name: string;
  language?: string;
  lines?: Array<{ format?: string; line?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const generalTextHandler = createHandler<GeneralTextLike, typeof doct>(
  'DOCT',
  {
    schema: doct,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_DOCT',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      LONGTEXTS: {
        item: [{
          DOKIL: {
            ID: 'TX',
            OBJECT: String(obj.name ?? '').toUpperCase(),
            LANGU: isoToSapLang(obj.language),
          },
          HEAD: {
            TDNAME: String(obj.name ?? '').toUpperCase(),
            TDID: 'TX',
            TDSPRAS: isoToSapLang(obj.language),
          },
          LINES: obj.lines?.length
            ? { item: obj.lines.map((l) => ({
                TDFORMAT: l.format,
                TDLINE: l.line,
              })) }
            : undefined,
        }],
      },
    }),

    fromAbapGit: ({ LONGTEXTS }) => {
      const items = normalizeItems(LONGTEXTS?.item);
      const first = items[0];
      const lines = normalizeItems(first?.LINES?.item);
      return {
        name: (first?.DOKIL?.OBJECT ?? '').toUpperCase(),
        language: sapLangToIso(first?.DOKIL?.LANGU),
        lines: lines.map((l) => ({ format: l.TDFORMAT, line: l.TDLINE })),
      };
    },
  },
);
