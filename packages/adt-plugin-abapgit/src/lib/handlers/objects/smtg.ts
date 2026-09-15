/**
 * SMTG (Email Template) handler for abapGit format
 *
 * Email templates are XML-only. The abapGit format stores the template
 * header (ID, name, type, category), header texts (HEADER_T), and
 * content (subject, body).
 */

import { smtg } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type EmailTemplateLike = {
  name: string;
  description?: string;
  templateName?: string;
  templateType?: string;
  templateCategory?: string;
  language?: string;
  masterLanguage?: string;
  headerTexts?: Array<{
    name?: string;
    description?: string;
    language?: string;
  }>;
  contents?: Array<{
    language?: string;
    subject?: string;
    body?: string;
  }>;
};

type SmtgHeaderTextXml = {
  NAME?: string;
  DESCRIPTION?: string;
  LANGU?: string;
};

type SmtgContentXml = {
  TMPL_ID?: string;
  LANGU?: string;
  SUBJECT?: string;
  BODY?: string;
};

const smtgHeaderTextFromXml = (t: SmtgHeaderTextXml) => ({
  name: t.NAME,
  description: t.DESCRIPTION,
  language: sapLangToIso(t.LANGU),
});

const smtgContentFromXml = (c: SmtgContentXml) => ({
  language: sapLangToIso(c.LANGU),
  subject: c.SUBJECT,
  body: c.BODY,
});

export const emailTemplateHandler = createHandler<
  EmailTemplateLike,
  typeof smtg
>('SMTG', {
  schema: smtg,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SMTG',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = (raw as { data?: EmailTemplateLike }).data ?? raw;
    const name = String(obj.name ?? '').toUpperCase();
    return {
      SMTG: {
        HEADER: {
          TMPL_ID: name,
          TMPL_NAME: obj.templateName,
          TMPL_TYPE: obj.templateType,
          TMPL_CATEGORY: obj.templateCategory,
          TMPL_LANGU: isoToSapLang(obj.masterLanguage || obj.language),
        },
        HEADER_T: obj.headerTexts?.length
          ? {
              item: obj.headerTexts.map((t) => ({
                NAME: t.name,
                DESCRIPTION: t.description,
                LANGU: isoToSapLang(
                  t.language || obj.masterLanguage || obj.language,
                ),
              })),
            }
          : undefined,
        CONTENT: obj.contents?.length
          ? {
              item: obj.contents.map((c) => ({
                TMPL_ID: name,
                LANGU: isoToSapLang(
                  c.language || obj.masterLanguage || obj.language,
                ),
                SUBJECT: c.subject,
                BODY: c.body,
              })),
            }
          : undefined,
      },
    };
  },

  fromAbapGit: ({ SMTG }) => {
    const header = SMTG?.HEADER;
    const headerTexts = normalizeItems(SMTG?.HEADER_T?.item);
    const contents = normalizeItems(SMTG?.CONTENT?.item);
    const lang = sapLangToIso(header?.TMPL_LANGU);
    return {
      name: (header?.TMPL_ID ?? '').toUpperCase(),
      description: header?.TMPL_NAME,
      templateName: header?.TMPL_NAME,
      templateType: header?.TMPL_TYPE,
      templateCategory: header?.TMPL_CATEGORY,
      language: lang,
      masterLanguage: lang,
      headerTexts: mapItems(headerTexts, smtgHeaderTextFromXml),
      contents: mapItems(contents, smtgContentFromXml),
    };
  },
});
