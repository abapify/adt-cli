/**
 * SMTG (Email Template) handler for abapGit format
 *
 * Email templates are XML-only. The abapGit format stores the template
 * header (ID, name, type, category) and content (subject, body).
 */

import { smtg } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type EmailTemplateLike = {
  name: string;
  description?: string;
  templateName?: string;
  templateType?: string;
  templateCategory?: string;
  language?: string;
  masterLanguage?: string;
  contents?: Array<{
    language?: string;
    subject?: string;
    body?: string;
  }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const emailTemplateHandler = createHandler<
  EmailTemplateLike,
  typeof smtg
>('SMTG', {
  schema: smtg,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SMTG',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
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
        CONTENTS: obj.contents?.length
          ? {
              item: obj.contents.map((c) => ({
                TMPL_ID: name,
                LANGU: isoToSapLang(c.language || obj.masterLanguage),
                SUBJECT: c.subject,
                BODY: c.body,
              })),
            }
          : undefined,
      },
    };
  },

  fromAbapGit: ({ SMTG }) => {
    const contents = normalizeItems(SMTG?.CONTENTS?.item);
    return {
      name: (SMTG?.HEADER?.TMPL_ID ?? '').toUpperCase(),
      description: SMTG?.HEADER?.TMPL_NAME,
      templateName: SMTG?.HEADER?.TMPL_NAME,
      templateType: SMTG?.HEADER?.TMPL_TYPE,
      templateCategory: SMTG?.HEADER?.TMPL_CATEGORY,
      language: sapLangToIso(SMTG?.HEADER?.TMPL_LANGU),
      masterLanguage: sapLangToIso(SMTG?.HEADER?.TMPL_LANGU),
      contents: contents.map((c) => ({
        language: sapLangToIso(c.LANGU),
        subject: c.SUBJECT,
        body: c.BODY,
      })),
    };
  },
});
