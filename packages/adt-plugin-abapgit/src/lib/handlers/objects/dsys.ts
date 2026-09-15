/**
 * DSYS (Documentation Object) handler for abapGit format
 *
 * Serializer version v2.0.0 uses LONGTEXTS structure.
 */

import { dsys } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type DocumentationObjectLike = {
  name: string;
  language?: string;
  lines?: Array<{ format?: string; line?: string }>;
};

export const documentationObjectHandler = createHandler<
  DocumentationObjectLike,
  typeof dsys
>('DSYS', {
  schema: dsys,
  version: 'v2.0.0',
  serializer: 'LCL_OBJECT_DSYS',
  serializer_version: 'v2.0.0',

  toAbapGit: (obj) => ({
    LONGTEXTS: {
      item: [
        {
          DOKIL: {
            ID: 'HY',
            OBJECT: String(obj.name ?? '').toUpperCase(),
            LANGU: isoToSapLang(obj.language),
            TYP: 'E',
          },
          HEAD: {
            TDOBJECT: 'DSYS',
            TDNAME: String(obj.name ?? '').toUpperCase(),
            TDID: 'HY',
            TDSPRAS: isoToSapLang(obj.language),
          },
          LINES: obj.lines?.length
            ? {
                item: obj.lines.map((l) => ({
                  TDFORMAT: l.format,
                  TDLINE: l.line,
                })),
              }
            : undefined,
        },
      ],
    },
  }),

  fromAbapGit: ({ LONGTEXTS }) => {
    const items = normalizeItems(LONGTEXTS?.item);
    const first = items[0];
    const lines = normalizeItems(first?.LINES?.item);
    return {
      name: (first?.DOKIL?.OBJECT ?? '').toUpperCase(),
      language: sapLangToIso(first?.DOKIL?.LANGU),
      lines: mapItems(lines, (l) => ({ format: l.TDFORMAT, line: l.TDLINE })),
    };
  },
});
