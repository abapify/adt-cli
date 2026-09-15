/**
 * SCP1 (Business Configuration Set) handler for abapGit format
 *
 * BC Sets are XML-only. The abapGit format stores attributes
 * (SCPRATTR), texts (SCPRTEXT), and values (SCPRVALS).
 */

import { scp1 } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type BusinessConfigSetLike = {
  name: string;
  description?: string;
  type?: string;
  clientDependent?: boolean;
  clientSpecific?: boolean;
  component?: string;
  minRelease?: string;
  maxRelease?: string;
  category?: string;
  refType?: string;
  refName?: string;
  orgId?: string;
  actInfo?: string;
  texts?: Array<{
    language?: string;
    text?: string;
  }>;
  values?: Array<{
    tableName?: string;
    fieldName?: string;
    value?: string;
  }>;
};

export const businessConfigSetHandler = createHandler<
  BusinessConfigSetLike,
  typeof scp1
>('SCP1', {
  schema: scp1,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SCP1',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const name = String(obj.name ?? '').toUpperCase();
    // Ensure description is included in texts (and first, since
    // fromAbapGit reads texts[0] as the description)
    const allTexts = [...(obj.texts ?? [])];
    if (obj.description) {
      const idx = allTexts.findIndex((t) => t.text === obj.description);
      if (idx === -1) {
        allTexts.unshift({
          language: obj.texts?.[0]?.language ?? 'en',
          text: obj.description,
        });
      } else if (idx > 0) {
        allTexts.unshift(allTexts.splice(idx, 1)[0]);
      }
    }
    return {
      SCP1: {
        SCPRATTR: {
          ID: name,
          TYPE: obj.type,
          CLI_DEP: obj.clientDependent ? 'X' : undefined,
          CLI_CAS: obj.clientSpecific ? 'X' : undefined,
          COMPONENT: obj.component,
          MINRELEASE: obj.minRelease,
          MAXRELEASE: obj.maxRelease,
          CATEGORY: obj.category,
          REFTYPE: obj.refType,
          REFNAME: obj.refName,
          ORGID: obj.orgId,
          ACT_INFO: obj.actInfo,
        },
        SCPRTEXT: allTexts.length
          ? {
              item: allTexts.map((t) => ({
                PROFID: name,
                LANGU: isoToSapLang(t.language),
                TEXT: t.text,
              })),
            }
          : undefined,
        SCPRVALS: obj.values?.length
          ? {
              item: obj.values.map((v) => ({
                PROFID: name,
                TABLENAME: v.tableName,
                FIELDNAME: v.fieldName,
                VALUE: v.value,
              })),
            }
          : undefined,
      },
    };
  },

  fromAbapGit: ({ SCP1 }) => {
    const texts = normalizeItems(SCP1?.SCPRTEXT?.item);
    const values = normalizeItems(SCP1?.SCPRVALS?.item);
    const firstText = texts[0];
    return {
      name: (SCP1?.SCPRATTR?.ID ?? '').toUpperCase(),
      description: firstText?.TEXT,
      type: SCP1?.SCPRATTR?.TYPE,
      clientDependent: SCP1?.SCPRATTR?.CLI_DEP === 'X',
      clientSpecific: SCP1?.SCPRATTR?.CLI_CAS === 'X',
      component: SCP1?.SCPRATTR?.COMPONENT,
      minRelease: SCP1?.SCPRATTR?.MINRELEASE,
      maxRelease: SCP1?.SCPRATTR?.MAXRELEASE,
      category: SCP1?.SCPRATTR?.CATEGORY,
      refType: SCP1?.SCPRATTR?.REFTYPE,
      refName: SCP1?.SCPRATTR?.REFNAME,
      orgId: SCP1?.SCPRATTR?.ORGID,
      actInfo: SCP1?.SCPRATTR?.ACT_INFO,
      texts: mapItems(texts, (t) => ({
        language: sapLangToIso(t.LANGU),
        text: t.TEXT,
      })),
      values: mapItems(values, (v) => ({
        tableName: v.TABLENAME,
        fieldName: v.FIELDNAME,
        value: v.VALUE,
      })),
    };
  },
});
