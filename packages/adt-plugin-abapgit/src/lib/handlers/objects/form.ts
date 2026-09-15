/**
 * FORM (SAPscript Form) handler for abapGit format
 *
 * SAPscript forms are multi-file XML. The main .form.xml stores
 * form header, text header, pages, windows, paragraphs, strings, tabs.
 * Language-specific tdlines files store the actual text content as
 * `{name}.form.tdlines_{lang}.xml` companion documents.
 */

import { form, tdlines } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { formatAbapGitXml } from '../xml-format';
import { sapLangToIso, isoToSapLang } from '../lang';

type TdlineRow = { line?: string; format?: string };

type FormLike = {
  name: string;
  description?: string;
  language?: string;
  firstPage?: string;
  pages?: Array<{ pageName?: string; nextPage?: string }>;
  windows?: Array<{ window?: string; pageName?: string }>;
  pageWindows?: Array<{ window?: string; pageName?: string }>;
  paragraphs?: Array<{ paragraph?: string; text?: string }>;
  strings?: Array<{ string?: string; text?: string; mark?: string }>;
  tabs?: Array<{ paragraph?: string; position?: string }>;
  /** Text lines keyed by ISO language (e.g. { en: [{line, format}] }) */
  tdlines?: Record<string, TdlineRow[]>;
};

export const formHandler = createHandler<FormLike, typeof form>('FORM', {
  schema: form,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_FORM',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const name = String(obj.name ?? '').toUpperCase();
    const lang = isoToSapLang(obj.language);
    return {
      FORM: {
        item: [
          {
            FORM_HEADER: {
              TDFORM: name,
              TDSPRAS: lang,
              TDFIRSTPAG: obj.firstPage,
              TDTEXT: obj.description,
            },
            TEXT_HEADER: {
              TDOBJECT: 'FORM',
              TDNAME: name,
              TDID: 'ST',
              TDSPRAS: lang,
              TDFORM: name,
            },
            ORIG_LANGUAGE: lang,
            PAGES: obj.pages?.length
              ? {
                  item: obj.pages.map((p) => ({
                    PAGENAME: p.pageName,
                    NEXTPAGE: p.nextPage,
                  })),
                }
              : undefined,
            WINDOWS: obj.windows?.length
              ? {
                  item: obj.windows.map((w) => ({
                    WINDOW: w.window,
                    PAGENAME: w.pageName,
                  })),
                }
              : undefined,
            PAGE_WINDOWS: obj.pageWindows?.length
              ? {
                  item: obj.pageWindows.map((w) => ({
                    TDWINDOW: w.window,
                    PAGENAME: w.pageName,
                  })),
                }
              : undefined,
            PARAGRAPHS: obj.paragraphs?.length
              ? {
                  item: obj.paragraphs.map((p) => ({
                    TDPARGRAPH: p.paragraph,
                    TDTEXT: p.text,
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
        ],
      },
    };
  },

  serialize: async (obj, ctx) => {
    const objectName = ctx.getObjectName(obj);
    const files = [
      ctx.createFile(
        `${objectName}.form.xml`,
        formatAbapGitXml(ctx.toAbapGitXml(obj)),
      ),
    ];
    for (const [lang, lines] of Object.entries(obj.tdlines ?? {})) {
      if (!lines.length) continue;
      const xml = tdlines.build(
        {
          abap: {
            version: '1.0',
            values: {
              TDLINES: {
                item: lines.map((l) => ({
                  TDLINE: l.line,
                  TDFORMAT: l.format,
                })),
              },
            },
          },
          version: 'v1.0.0',
          serializer: 'LCL_OBJECT_FORM',
          serializer_version: 'v1.0.0',
        } as never,
        { pretty: true },
      );
      files.push(
        ctx.createFile(
          `${objectName}.form.tdlines_${isoToSapLang(lang).toLowerCase()}.xml`,
          formatAbapGitXml(xml),
        ),
      );
    }
    return files;
  },

  // Language-specific tdlines companion files ({name}.form.tdlines_{lang}.xml)
  // are collected as sources during deserialization.
  setSources: (obj, sources) => {
    const data = unwrapData<Record<string, unknown>>(obj);
    const tdlinesData = (data.tdlines ?? {}) as Record<string, TdlineRow[]>;
    for (const [key, content] of Object.entries(sources)) {
      const match = key.match(/^tdlines_([a-zA-Z0-9]+)$/);
      if (!match) continue;
      const parsed = tdlines.parse(content) as {
        abapGit?: { abap?: { values?: { TDLINES?: { item?: unknown } } } };
      };
      const items = normalizeItems(
        parsed.abapGit?.abap?.values?.TDLINES?.item,
      ) as Array<{ TDLINE?: string; TDFORMAT?: string }>;
      tdlinesData[sapLangToIso(match[1].toUpperCase())] = items.map((l) => ({
        line: l.TDLINE,
        format: l.TDFORMAT,
      }));
    }
    if (Object.keys(tdlinesData).length) data.tdlines = tdlinesData;
  },

  fromAbapGit: ({ FORM }) => {
    const items = normalizeItems(FORM?.item);
    const data = items[0];
    const pages = normalizeItems(data?.PAGES?.item);
    const windows = normalizeItems(data?.WINDOWS?.item);
    const pageWindows = normalizeItems(data?.PAGE_WINDOWS?.item);
    const paragraphs = normalizeItems(data?.PARAGRAPHS?.item);
    const strings = normalizeItems(data?.STRINGS?.item);
    const tabs = normalizeItems(data?.TABS?.item);
    return {
      name: (data?.FORM_HEADER?.TDFORM ?? '').toUpperCase(),
      description: data?.FORM_HEADER?.TDTEXT,
      language: sapLangToIso(data?.FORM_HEADER?.TDSPRAS ?? data?.ORIG_LANGUAGE),
      firstPage: data?.FORM_HEADER?.TDFIRSTPAG,
      pages: mapItems(pages, (p) => ({
        pageName: p.PAGENAME,
        nextPage: p.NEXTPAGE,
      })),
      windows: mapItems(windows, (w) => ({
        window: w.WINDOW,
        pageName: w.PAGENAME,
      })),
      pageWindows: mapItems(pageWindows, (w) => ({
        window: w.TDWINDOW,
        pageName: w.PAGENAME,
      })),
      paragraphs: mapItems(paragraphs, (p) => ({
        paragraph: p.TDPARGRAPH,
        text: p.TDTEXT,
      })),
      strings: mapItems(strings, (s) => ({
        string: s.TDSTRING,
        text: s.TDTEXT,
        mark: s.TDMARK,
      })),
      tabs: mapItems(tabs, (t) => ({
        paragraph: t.TDPARGRAPH,
        position: t.TDPOSITION,
      })),
    };
  },
});
