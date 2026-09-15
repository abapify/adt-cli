/**
 * CHDO (Change Document) handler for abapGit format
 *
 * Change document objects are XML-only. The abapGit format stores
 * generated reports (TCDRPS), tracked tables (TCDOBS), and texts.
 */

import { chdo } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type ChangeDocumentObjectLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  generatedReports?: Array<{
    object?: string;
    reportName?: string;
    area?: string;
    errorNumber?: string;
  }>;
  objects?: Array<{
    object?: string;
    tableName?: string;
    docDelete?: boolean;
    docInsert?: boolean;
    docUpdateNoIf?: boolean;
  }>;
  objectTexts?: Array<{
    language?: string;
    object?: string;
    text?: string;
  }>;
};

export const changeDocumentObjectHandler = createHandler<
  ChangeDocumentObjectLike,
  typeof chdo
>('CHDO', {
  schema: chdo,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_CHDO',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const name = String(obj.name ?? '').toUpperCase();
    return {
      CHDO: {
        REPORTS_GENERATED: obj.generatedReports?.length
          ? {
              TCDRPS: obj.generatedReports.map((r) => ({
                OBJECT: r.object ?? name,
                REPORTNAME: r.reportName,
                ARBGEB: r.area,
                FEHLERNR: r.errorNumber,
              })),
            }
          : undefined,
        OBJECTS: obj.objects?.length
          ? {
              TCDOBS: obj.objects.map((o) => ({
                OBJECT: o.object ?? name,
                TABNAME: o.tableName,
                DOCUDEL: o.docDelete ? 'X' : undefined,
                DOCUINS: o.docInsert ? 'X' : undefined,
                DOCUD_NOIF: o.docUpdateNoIf ? 'X' : undefined,
              })),
            }
          : undefined,
        OBJECTS_TEXT: obj.objectTexts?.length
          ? {
              TCDOBTS: mapItems(obj.objectTexts, (t) => ({
                SPRAS: isoToSapLang(
                  t.language || obj.masterLanguage || obj.language,
                ),
                OBJECT: t.object ?? name,
                OBTEXT: t.text,
              })),
            }
          : obj.description
            ? {
                TCDOBTS: [
                  {
                    SPRAS: isoToSapLang(obj.masterLanguage || obj.language),
                    OBJECT: name,
                    OBTEXT: obj.description,
                  },
                ],
              }
            : undefined,
      },
    };
  },

  fromAbapGit: ({ CHDO }) => {
    const reports = normalizeItems(CHDO?.REPORTS_GENERATED?.TCDRPS);
    const objects = normalizeItems(CHDO?.OBJECTS?.TCDOBS);
    const texts = normalizeItems(CHDO?.OBJECTS_TEXT?.TCDOBTS);
    const firstText = texts[0];
    return {
      name: (
        firstText?.OBJECT ??
        reports[0]?.OBJECT ??
        objects[0]?.OBJECT ??
        ''
      ).toUpperCase(),
      description: firstText?.OBTEXT,
      language: sapLangToIso(firstText?.SPRAS),
      masterLanguage: sapLangToIso(firstText?.SPRAS),
      objectTexts: mapItems(texts, (t) => ({
        language: sapLangToIso(t.SPRAS),
        object: t.OBJECT,
        text: t.OBTEXT,
      })),
      generatedReports: mapItems(reports, (r) => ({
        object: r.OBJECT,
        reportName: r.REPORTNAME,
        area: r.ARBGEB,
        errorNumber: r.FEHLERNR,
      })),
      objects: mapItems(objects, (o) => ({
        object: o.OBJECT,
        tableName: o.TABNAME,
        docDelete: o.DOCUDEL === 'X',
        docInsert: o.DOCUINS === 'X',
        docUpdateNoIf: o.DOCUD_NOIF === 'X',
      })),
    };
  },
});
