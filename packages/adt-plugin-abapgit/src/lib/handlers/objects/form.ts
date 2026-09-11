/**
 * FORM (SAPscript Form) handler for abapGit format
 *
 * SAPscript forms are multi-file XML. The main .form.xml stores
 * form header, text header, pages, windows, paragraphs, strings, tabs.
 * Language-specific tdlines files store the actual text content.
 */

import { form } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type FormLike = {
  name: string;
  description?: string;
  language?: string;
  firstPage?: string;
  pages?: Array<{ pageName?: string; nextPage?: string }>;
  windows?: Array<{ window?: string; pageName?: string }>;
  paragraphs?: Array<{ paragraph?: string; text?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const formHandler = createHandler<FormLike, typeof form>(
  'FORM',
  {
    schema: form,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_FORM',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      const lang = isoToSapLang(obj.language);
      return {
        FORM: {
          item: [{
            FORM_HEADER: {
              TDFORM: name,
              TDSPRAS: lang,
              TDFIRSTPAG: obj.firstPage,
              TDTEXT: obj.description,
            },
            TEXT_HEADER: {
              TDOBJECT: 'TEXT',
              TDNAME: name,
              TDID: 'ST',
              TDSPRAS: lang,
              TDFORM: name,
            },
            ORIG_LANGUAGE: lang,
            PAGES: obj.pages?.length
              ? { item: obj.pages.map((p) => ({ PAGENAME: p.pageName, NEXTPAGE: p.nextPage })) }
              : undefined,
            WINDOWS: obj.windows?.length
              ? { item: obj.windows.map((w) => ({ WINDOW: w.window, PAGENAME: w.pageName })) }
              : undefined,
            PARAGRAPHS: obj.paragraphs?.length
              ? { item: obj.paragraphs.map((p) => ({ TDPARGRAPH: p.paragraph, TDTEXT: p.text })) }
              : undefined,
          }],
        },
      };
    },

    fromAbapGit: ({ FORM }) => {
      const items = normalizeItems(FORM?.item);
      const data = items[0];
      const pages = normalizeItems(data?.PAGES?.item);
      const windows = normalizeItems(data?.WINDOWS?.item);
      const paragraphs = normalizeItems(data?.PARAGRAPHS?.item);
      return {
        name: (data?.FORM_HEADER?.TDFORM ?? '').toUpperCase(),
        description: data?.FORM_HEADER?.TDTEXT,
        language: sapLangToIso(data?.FORM_HEADER?.TDSPRAS ?? data?.ORIG_LANGUAGE),
        firstPage: data?.FORM_HEADER?.TDFIRSTPAG,
        pages: pages.map((p) => ({ pageName: p.PAGENAME, nextPage: p.NEXTPAGE })),
        windows: windows.map((w) => ({ window: w.WINDOW, pageName: w.PAGENAME })),
        paragraphs: paragraphs.map((p) => ({ paragraph: p.TDPARGRAPH, text: p.TDTEXT })),
      };
    },
  },
);
