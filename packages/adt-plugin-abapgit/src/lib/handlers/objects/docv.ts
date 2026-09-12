/**
 * DOCV (Documentation) handler for abapGit format
 */

import { docv } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type DocumentationLike = {
  name: string;
  docTitle?: string;
  language?: string;
  lines?: Array<{ format?: string; line?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const documentationHandler = createHandler<DocumentationLike, typeof docv>(
  'DOCV',
  {
    schema: docv,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_DOCV',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      DOC: {
        DOCTITLE: obj.docTitle,
        HEAD: {
          TDNAME: String(obj.name ?? '').toUpperCase(),
          TDSPRAS: isoToSapLang(obj.language),
          TDTITLE: obj.docTitle,
        },
        LINES: obj.lines?.length
          ? { item: obj.lines.map((l) => ({
              TDFORMAT: l.format,
              TDLINE: l.line,
            })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ DOC }) => {
      const lines = normalizeItems(DOC?.LINES?.item);
      return {
        name: (DOC?.HEAD?.TDNAME ?? '').toUpperCase(),
        docTitle: DOC?.DOCTITLE,
        language: sapLangToIso(DOC?.HEAD?.TDSPRAS),
        lines: lines.map((l) => ({ format: l.TDFORMAT, line: l.TDLINE })),
      };
    },
  },
);
