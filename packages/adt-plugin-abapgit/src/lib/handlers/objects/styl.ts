/**
 * STYL (SAPscript Style) handler for abapGit format
 *
 * SAPscript styles are XML-only. The abapGit format stores
 * header, paragraphs, strings, and tabs under a STYLE node.
 */

import { styl } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type StyleLike = {
  name: string;
  description?: string;
  language?: string;
  origLanguage?: string;
  printer?: string;
  firstParagraph?: string;
  cpi?: string;
  lpi?: string;
  transtat?: string;
  status?: string;
  pageForm?: string;
  pageHeight?: string;
  pageWidth?: string;
  family?: string;
  version?: string;
  pvers?: string;
  paragraphs?: Array<{
    paragraph?: string;
    text?: string;
    justify?: string;
    lineDist?: string;
    top?: string;
    bot?: string;
    left?: string;
    right?: string;
  }>;
  strings?: Array<{
    string?: string;
    text?: string;
    mark?: string;
    sup?: string;
    sub?: string;
    hidden?: string;
    protline?: string;
  }>;
  tabs?: Array<{
    paragraph?: string;
    position?: string;
    tabPos?: string;
    tjustify?: string;
  }>;
};

export const styleHandler = createHandler<StyleLike, typeof styl>('STYL', {
  schema: styl,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_STYL',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<StyleLike>(raw);
    return {
      STYLE: {
        HEADER: {
          TDSTYLE: String(obj.name ?? '').toUpperCase(),
          TDSPRAS: isoToSapLang(obj.language),
          TDOSPRAS: isoToSapLang(obj.origLanguage),
          TDPRINTER: obj.printer,
          TDTEXT: obj.description,
          TDFIRSTPAR: obj.firstParagraph,
          TDCPI: obj.cpi,
          TDLPI: obj.lpi,
          TDTRANSTAT: obj.transtat,
          TDSTATUS: obj.status,
          TDPAGEFORM: obj.pageForm,
          TDPAGHEIGH: obj.pageHeight,
          TDPAGWIDTH: obj.pageWidth,
          TDFAMILY: obj.family,
          TDVERSION: obj.version,
          PVERS: obj.pvers,
        },
        PARAGRAPHS: obj.paragraphs?.length
          ? {
              item: obj.paragraphs.map((p) => ({
                TDPARGRAPH: p.paragraph,
                TDTEXT: p.text,
                TDPJUSTIFY: p.justify,
                TDPLDIST: p.lineDist,
                TDPTOP: p.top,
                TDPBOT: p.bot,
                TDPLEFT: p.left,
                TDPRIGHT: p.right,
              })),
            }
          : undefined,
        STRINGS: obj.strings?.length
          ? {
              item: obj.strings.map((s) => ({
                TDSTRING: s.string,
                TDTEXT: s.text,
                TDMARK: s.mark,
                TDSUPER: s.sup,
                TDSUB: s.sub,
                TDHIDDEN: s.hidden,
                TDPROTLINE: s.protline,
              })),
            }
          : undefined,
        TABS: obj.tabs?.length
          ? {
              item: obj.tabs.map((t) => ({
                TDPARGRAPH: t.paragraph,
                TDPOSITION: t.position,
                TDTABPOS: t.tabPos,
                TDTJUSTIFY: t.tjustify,
              })),
            }
          : undefined,
      },
    };
  },

  fromAbapGit: ({ STYLE }) => {
    const paragraphs = normalizeItems(STYLE?.PARAGRAPHS?.item);
    const strings = normalizeItems(STYLE?.STRINGS?.item);
    const tabs = normalizeItems(STYLE?.TABS?.item);
    return {
      name: (STYLE?.HEADER?.TDSTYLE ?? '').toUpperCase(),
      description: STYLE?.HEADER?.TDTEXT,
      language: sapLangToIso(STYLE?.HEADER?.TDSPRAS),
      origLanguage: sapLangToIso(STYLE?.HEADER?.TDOSPRAS),
      printer: STYLE?.HEADER?.TDPRINTER,
      firstParagraph: STYLE?.HEADER?.TDFIRSTPAR,
      cpi: STYLE?.HEADER?.TDCPI,
      lpi: STYLE?.HEADER?.TDLPI,
      transtat: STYLE?.HEADER?.TDTRANSTAT,
      status: STYLE?.HEADER?.TDSTATUS,
      pageForm: STYLE?.HEADER?.TDPAGEFORM,
      pageHeight: STYLE?.HEADER?.TDPAGHEIGH,
      pageWidth: STYLE?.HEADER?.TDPAGWIDTH,
      family: STYLE?.HEADER?.TDFAMILY,
      version: STYLE?.HEADER?.TDVERSION,
      pvers: STYLE?.HEADER?.PVERS,
      paragraphs: mapItems(paragraphs, (p) => ({
        paragraph: p.TDPARGRAPH,
        text: p.TDTEXT,
        justify: p.TDPJUSTIFY,
        lineDist: p.TDPLDIST,
        top: p.TDPTOP,
        bot: p.TDPBOT,
        left: p.TDPLEFT,
        right: p.TDPRIGHT,
      })),
      strings: mapItems(strings, (s) => ({
        string: s.TDSTRING,
        text: s.TDTEXT,
        mark: s.TDMARK,
        sup: s.TDSUPER,
        sub: s.TDSUB,
        hidden: s.TDHIDDEN,
        protline: s.TDPROTLINE,
      })),
      tabs: mapItems(tabs, (t) => ({
        paragraph: t.TDPARGRAPH,
        position: t.TDPOSITION,
        tabPos: t.TDTABPOS,
        tjustify: t.TDTJUSTIFY,
      })),
    };
  },
});
