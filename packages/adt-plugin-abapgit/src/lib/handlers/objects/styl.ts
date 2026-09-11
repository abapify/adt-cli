/**
 * STYL (SAPscript Style) handler for abapGit format
 *
 * SAPscript styles are XML-only. The abapGit format stores
 * header, paragraphs, strings, and tabs under a STYLE node.
 */

import { styl } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type StyleLike = {
  name: string;
  description?: string;
  language?: string;
  printer?: string;
  firstParagraph?: string;
  paragraphs?: Array<{
    paragraph?: string;
    text?: string;
    justify?: string;
  }>;
  strings?: Array<{
    string?: string;
    text?: string;
    mark?: string;
  }>;
  tabs?: Array<{
    paragraph?: string;
    position?: string;
  }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const styleHandler = createHandler<StyleLike, typeof styl>(
  'STYL',
  {
    schema: styl,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_STYL',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      STYLE: {
        HEADER: {
          TDSTYLE: String(obj.name ?? '').toUpperCase(),
          TDSPRAS: isoToSapLang(obj.language),
          TDPRINTER: obj.printer,
          TDTEXT: obj.description,
          TDFIRSTPAR: obj.firstParagraph,
        },
        PARAGRAPHS: obj.paragraphs?.length
          ? {
              item: obj.paragraphs.map((p) => ({
                TDPARGRAPH: p.paragraph,
                TDTEXT: p.text,
                TDPJUSTIFY: p.justify,
              })),
            }
          : undefined,
        STRINGS: obj.strings?.length
          ? {
              item: obj.strings.map((s) => ({
                TDSTRING: s.string,
                TDTEXT: s.text,
                TDMARK: s.mark,
              })),
            }
          : undefined,
        TABS: obj.tabs?.length
          ? {
              item: obj.tabs.map((t) => ({
                TDPARGRAPH: t.paragraph,
                TDPOSITION: t.position,
              })),
            }
          : undefined,
      },
    }),

    fromAbapGit: ({ STYLE }) => {
      const paragraphs = normalizeItems(STYLE?.PARAGRAPHS?.item);
      const strings = normalizeItems(STYLE?.STRINGS?.item);
      const tabs = normalizeItems(STYLE?.TABS?.item);
      return {
        name: (STYLE?.HEADER?.TDSTYLE ?? '').toUpperCase(),
        description: STYLE?.HEADER?.TDTEXT,
        language: sapLangToIso(STYLE?.HEADER?.TDSPRAS),
        printer: STYLE?.HEADER?.TDPRINTER,
        firstParagraph: STYLE?.HEADER?.TDFIRSTPAR,
        paragraphs: paragraphs.map((p) => ({
          paragraph: p.TDPARGRAPH,
          text: p.TDTEXT,
          justify: p.TDPJUSTIFY,
        })),
        strings: strings.map((s) => ({
          string: s.TDSTRING,
          text: s.TDTEXT,
          mark: s.TDMARK,
        })),
        tabs: tabs.map((t) => ({
          paragraph: t.TDPARGRAPH,
          position: t.TDPOSITION,
        })),
      };
    },
  },
);
