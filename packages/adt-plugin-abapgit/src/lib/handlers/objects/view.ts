/**
 * VIEW (Database View) object handler for abapGit format
 *
 * Database views are XML-only (no source code). The abapGit format stores
 * the view header in DD25V, table assignments in DD26V_TABLE, view fields
 * in DD27P_TABLE and selection conditions in DD28V_TABLE.
 */

import { view } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type ViewLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  viewClass?: string;
  baseTable?: string;
  baseTableField?: string;
  tables?: Array<{
    tableName?: string;
    position?: string;
    foreignView?: string;
    foreignField?: string;
    readOnly?: boolean;
  }>;
  fields?: Array<{
    viewField?: string;
    tableName?: string;
    fieldName?: string;
    keyFlag?: boolean;
    readOnly?: boolean;
    rollName?: string;
    checkTable?: string;
    description?: string;
  }>;
  selectionConditions?: Array<{
    andOr?: string;
    leftBracket?: string;
    fieldName?: string;
    operator?: string;
    constantValue?: string;
    rightBracket?: string;
  }>;
};

export const viewHandler = createHandler<ViewLike, typeof view>('VIEW', {
  schema: view,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_VIEW',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const tables = obj.tables ?? [];
    const fields = obj.fields ?? [];
    const conditions = obj.selectionConditions ?? [];
    return {
      DD25V: {
        VIEWNAME: String(obj.name ?? '').toUpperCase(),
        DDLANGUAGE: isoToSapLang(obj.language),
        DDTEXT: obj.description ?? '',
        VIEWCLASS: obj.viewClass ?? undefined,
        ROOTTAB: obj.baseTable ?? undefined,
        ROOTFIELD: obj.baseTableField ?? undefined,
      },
      DD26V_TABLE:
        tables.length > 0
          ? {
              item: tables.map((t) => ({
                VIEWNAME: String(obj.name ?? '').toUpperCase(),
                TABNAME: t.tableName ?? undefined,
                TABPOS: t.position ?? undefined,
                FVIEWNAME: t.foreignView ?? undefined,
                FFIELDNAME: t.foreignField ?? undefined,
                READONLY: t.readOnly ? 'X' : undefined,
              })),
            }
          : undefined,
      DD27P_TABLE:
        fields.length > 0
          ? {
              item: fields.map((f) => ({
                VIEWNAME: String(obj.name ?? '').toUpperCase(),
                VIEWFIELD: f.viewField ?? undefined,
                TABNAME: f.tableName ?? undefined,
                FIELDNAME: f.fieldName ?? undefined,
                KEYFLAG: f.keyFlag ? 'X' : undefined,
                READONLY: f.readOnly ? 'X' : undefined,
                ROLLNAME: f.rollName ?? undefined,
                CHECKTABLE: f.checkTable ?? undefined,
                DDTEXT: f.description ?? undefined,
              })),
            }
          : undefined,
      DD28V_TABLE:
        conditions.length > 0
          ? {
              item: conditions.map((c) => ({
                VIEWNAME: String(obj.name ?? '').toUpperCase(),
                ANDOR: c.andOr ?? undefined,
                LEFTBRACKET: c.leftBracket ?? undefined,
                FIELDNAME: c.fieldName ?? undefined,
                OPERATOR: c.operator ?? undefined,
                CONST_VALUE: c.constantValue ?? undefined,
                RIGHTBRACKET: c.rightBracket ?? undefined,
              })),
            }
          : undefined,
    };
  },

  fromAbapGit: parseViewFromAbapGit,
});

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parseViewTable(t: {
  TABNAME?: string;
  TABPOS?: string;
  FVIEWNAME?: string;
  FFIELDNAME?: string;
  READONLY?: string;
}) {
  return {
    tableName: t.TABNAME,
    position: t.TABPOS,
    foreignView: t.FVIEWNAME,
    foreignField: t.FFIELDNAME,
    readOnly: t.READONLY === 'X',
  };
}

function parseViewField(f: {
  VIEWFIELD?: string;
  TABNAME?: string;
  FIELDNAME?: string;
  KEYFLAG?: string;
  READONLY?: string;
  ROLLNAME?: string;
  CHECKTABLE?: string;
  DDTEXT?: string;
}) {
  return {
    viewField: f.VIEWFIELD,
    tableName: f.TABNAME,
    fieldName: f.FIELDNAME,
    keyFlag: f.KEYFLAG === 'X',
    readOnly: f.READONLY === 'X',
    rollName: f.ROLLNAME,
    checkTable: f.CHECKTABLE,
    description: f.DDTEXT,
  };
}

function parseViewCondition(c: {
  ANDOR?: string;
  LEFTBRACKET?: string;
  FIELDNAME?: string;
  OPERATOR?: string;
  CONST_VALUE?: string;
  RIGHTBRACKET?: string;
}) {
  return {
    andOr: c.ANDOR,
    leftBracket: c.LEFTBRACKET,
    fieldName: c.FIELDNAME,
    operator: c.OPERATOR,
    constantValue: c.CONST_VALUE,
    rightBracket: c.RIGHTBRACKET,
  };
}

function parseViewFromAbapGit({
  DD25V,
  DD26V_TABLE,
  DD27P_TABLE,
  DD28V_TABLE,
}: {
  DD25V?: {
    VIEWNAME?: string;
    DDTEXT?: string;
    DDLANGUAGE?: string;
    VIEWCLASS?: string;
    ROOTTAB?: string;
    ROOTFIELD?: string;
  };
  DD26V_TABLE?: { item?: unknown };
  DD27P_TABLE?: { item?: unknown };
  DD28V_TABLE?: { item?: unknown };
}): { name: string } & Record<string, unknown> {
  const tableItems = normalizeItems(DD26V_TABLE?.item);
  const fieldItems = normalizeItems(DD27P_TABLE?.item);
  const condItems = normalizeItems(DD28V_TABLE?.item);
  return {
    name: (DD25V?.VIEWNAME ?? '').toUpperCase(),
    type: 'VIEW/VD',
    description: DD25V?.DDTEXT,
    language: sapLangToIso(DD25V?.DDLANGUAGE),
    masterLanguage: sapLangToIso(DD25V?.DDLANGUAGE),
    viewClass: DD25V?.VIEWCLASS,
    baseTable: DD25V?.ROOTTAB,
    baseTableField: DD25V?.ROOTFIELD,
    tables: tableItems.map(parseViewTable),
    fields: fieldItems.map(parseViewField),
    selectionConditions: condItems.map(parseViewCondition),
  };
}
