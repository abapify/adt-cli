/**
 * ENQU (Lock Object) object handler for abapGit format
 *
 * Lock objects are XML-only (no source code). The abapGit format stores
 * the lock object header in DD25V, table assignments in DD26V_TABLE and
 * lock parameters in DD27P_TABLE.
 */

import { enqu } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type LockObjectLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  baseTable?: string;
  baseTableField?: string;
  tables?: Array<{
    tableName?: string;
    position?: string;
    foreignView?: string;
    foreignField?: string;
    readOnly?: boolean;
  }>;
  parameters?: Array<{
    viewField?: string;
    tableName?: string;
    fieldName?: string;
    keyFlag?: boolean;
    rollName?: string;
    checkTable?: string;
    description?: string;
  }>;
};

export const lockObjectHandler = createHandler<LockObjectLike, typeof enqu>(
  'ENQU',
  {
    schema: enqu,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_ENQU',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const tables = obj.tables ?? [];
      const parameters = obj.parameters ?? [];
      return {
        DD25V: {
          VIEWNAME: String(obj.name ?? '').toUpperCase(),
          DDLANGUAGE: isoToSapLang(obj.masterLanguage || obj.language),
          DDTEXT: obj.description ?? '',
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
          parameters.length > 0
            ? {
                item: parameters.map((p) => ({
                  VIEWNAME: String(obj.name ?? '').toUpperCase(),
                  VIEWFIELD: p.viewField ?? undefined,
                  TABNAME: p.tableName ?? undefined,
                  FIELDNAME: p.fieldName ?? undefined,
                  KEYFLAG: p.keyFlag ? 'X' : undefined,
                  ROLLNAME: p.rollName ?? undefined,
                  CHECKTABLE: p.checkTable ?? undefined,
                  DDTEXT: p.description ?? undefined,
                })),
              }
            : undefined,
      };
    },

    fromAbapGit: parseLockObjectFromAbapGit,
  },
);

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parseEnquTable(t: {
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

function parseEnquParam(p: {
  VIEWFIELD?: string;
  TABNAME?: string;
  FIELDNAME?: string;
  KEYFLAG?: string;
  ROLLNAME?: string;
  CHECKTABLE?: string;
  DDTEXT?: string;
}) {
  return {
    viewField: p.VIEWFIELD,
    tableName: p.TABNAME,
    fieldName: p.FIELDNAME,
    keyFlag: p.KEYFLAG === 'X',
    rollName: p.ROLLNAME,
    checkTable: p.CHECKTABLE,
    description: p.DDTEXT,
  };
}

function parseLockObjectFromAbapGit({
  DD25V,
  DD26V_TABLE,
  DD27P_TABLE,
}: {
  DD25V?: {
    VIEWNAME?: string;
    DDTEXT?: string;
    DDLANGUAGE?: string;
    ROOTTAB?: string;
    ROOTFIELD?: string;
  };
  DD26V_TABLE?: { item?: unknown };
  DD27P_TABLE?: { item?: unknown };
}): { name: string } & Record<string, unknown> {
  const tableItems = normalizeItems(DD26V_TABLE?.item);
  const paramItems = normalizeItems(DD27P_TABLE?.item);
  return {
    name: (DD25V?.VIEWNAME ?? '').toUpperCase(),
    type: 'ENQU/LO',
    description: DD25V?.DDTEXT,
    language: sapLangToIso(DD25V?.DDLANGUAGE),
    masterLanguage: sapLangToIso(DD25V?.DDLANGUAGE),
    baseTable: DD25V?.ROOTTAB,
    baseTableField: DD25V?.ROOTFIELD,
    tables: tableItems.map(parseEnquTable),
    parameters: paramItems.map(parseEnquParam),
  };
}
