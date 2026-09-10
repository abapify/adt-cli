/**
 * SCP1 (Business Configuration Set) handler for abapGit format
 *
 * BC Sets are XML-only. The abapGit format stores attributes
 * (SCPRATTR), texts (SCPRTEXT), and values (SCPRVALS).
 */

import { scp1 } from '../../../schemas/generated';
import { createHandler } from '../base';
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

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

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
        },
        SCPRTEXT: obj.texts?.length
          ? {
              item: obj.texts.map((t) => ({
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
      texts: texts.map((t) => ({
        language: sapLangToIso(t.LANGU),
        text: t.TEXT,
      })),
      values: values.map((v) => ({
        tableName: v.TABLENAME,
        fieldName: v.FIELDNAME,
        value: v.VALUE,
      })),
    };
  },
});
