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
              item: obj.generatedReports.map((r) => ({
                OBJECT: r.object ?? name,
                REPORTNAME: r.reportName,
                ARBGEB: r.area,
                FEHLERNR: r.errorNumber,
              })),
            }
          : undefined,
        OBJECTS: obj.objects?.length
          ? {
              item: obj.objects.map((o) => ({
                OBJECT: o.object ?? name,
                TABNAME: o.tableName,
                DOCUDEL: o.docDelete ? 'X' : undefined,
                DOCUINS: o.docInsert ? 'X' : undefined,
                DOCUD_NOIF: o.docUpdateNoIf ? 'X' : undefined,
              })),
            }
          : undefined,
        OBJECTS_TEXT: obj.description
          ? {
              item: [
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
    const reports = normalizeItems(CHDO?.REPORTS_GENERATED?.item);
    const objects = normalizeItems(CHDO?.OBJECTS?.item);
    const texts = normalizeItems(CHDO?.OBJECTS_TEXT?.item);
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
