/**
 * SHLP (Search Help) object handler for abapGit format
 *
 * Search helps are XML-only (no source code). The abapGit format stores
 * the search help header in DD30V, the text table info in DD31V,
 * parameters in DD32P_TABLE and field assignments in DD33V_TABLE.
 */

import { shlp } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type SearchHelpLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  helpType?: string;
  dialogType?: string;
  textTable?: {
    tableName?: string;
    fieldName?: string;
    fieldLocation?: string;
    rollName?: string;
  };
  parameters?: Array<{
    fieldName?: string;
    input?: boolean;
    output?: boolean;
    selectionPosition?: string;
    listPosition?: string;
    defaultValue?: string;
    rollName?: string;
    description?: string;
  }>;
  fieldAssignments?: Array<{
    helpField?: string;
    tableName?: string;
    fieldName?: string;
    input?: boolean;
    output?: boolean;
  }>;
};

export const searchHelpHandler = createHandler<SearchHelpLike, typeof shlp>(
  'SHLP',
  {
    schema: shlp,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SHLP',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const parameters = obj.parameters ?? [];
      const assignments = obj.fieldAssignments ?? [];
      return {
        DD30V: {
          SHLPNAME: String(obj.name ?? '').toUpperCase(),
          DDLANGUAGE: isoToSapLang(obj.language),
          DDTEXT: obj.description ?? '',
          SHLPTYPE: obj.helpType ?? undefined,
          DIALOGTYPE: obj.dialogType ?? undefined,
        },
        DD31V: obj.textTable
          ? {
              SHLPNAME: String(obj.name ?? '').toUpperCase(),
              TABNAME: obj.textTable.tableName ?? undefined,
              FIELDNAME: obj.textTable.fieldName ?? undefined,
              FLDLOCATION: obj.textTable.fieldLocation ?? undefined,
              ROLLNAME: obj.textTable.rollName ?? undefined,
            }
          : undefined,
        DD32P_TABLE:
          parameters.length > 0
            ? {
                item: parameters.map((p) => ({
                  SHLPNAME: String(obj.name ?? '').toUpperCase(),
                  FIELDNAME: p.fieldName ?? undefined,
                  SHLPINPUT: p.input ? 'X' : undefined,
                  SHLPOUTPUT: p.output ? 'X' : undefined,
                  SHLPSELPOS: p.selectionPosition ?? undefined,
                  SHLPLISPOS: p.listPosition ?? undefined,
                  DEFAULTVAL: p.defaultValue ?? undefined,
                  ROLLNAME: p.rollName ?? undefined,
                  DDTEXT: p.description ?? undefined,
                })),
              }
            : undefined,
        DD33V_TABLE:
          assignments.length > 0
            ? {
                item: assignments.map((a) => ({
                  SHLPNAME: String(obj.name ?? '').toUpperCase(),
                  SHLPFIELD: a.helpField ?? undefined,
                  TABNAME: a.tableName ?? undefined,
                  FIELDNAME: a.fieldName ?? undefined,
                  SHLPINPUT: a.input ? 'X' : undefined,
                  SHLPOUTPUT: a.output ? 'X' : undefined,
                })),
              }
            : undefined,
      };
    },

    fromAbapGit: parseSearchHelpFromAbapGit,
  },
);

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parseShlpParam(p: {
  FIELDNAME?: string;
  SHLPINPUT?: string;
  SHLPOUTPUT?: string;
  SHLPSELPOS?: string;
  SHLPLISPOS?: string;
  DEFAULTVAL?: string;
  ROLLNAME?: string;
  DDTEXT?: string;
}) {
  return {
    fieldName: p.FIELDNAME,
    input: p.SHLPINPUT === 'X',
    output: p.SHLPOUTPUT === 'X',
    selectionPosition: p.SHLPSELPOS,
    listPosition: p.SHLPLISPOS,
    defaultValue: p.DEFAULTVAL,
    rollName: p.ROLLNAME,
    description: p.DDTEXT,
  };
}

function parseShlpAssign(a: {
  SHLPFIELD?: string;
  TABNAME?: string;
  FIELDNAME?: string;
  SHLPINPUT?: string;
  SHLPOUTPUT?: string;
}) {
  return {
    helpField: a.SHLPFIELD,
    tableName: a.TABNAME,
    fieldName: a.FIELDNAME,
    input: a.SHLPINPUT === 'X',
    output: a.SHLPOUTPUT === 'X',
  };
}

function parseSearchHelpFromAbapGit({
  DD30V,
  DD31V,
  DD32P_TABLE,
  DD33V_TABLE,
}: {
  DD30V?: {
    SHLPNAME?: string;
    DDTEXT?: string;
    DDLANGUAGE?: string;
    SHLPTYPE?: string;
    DIALOGTYPE?: string;
  };
  DD31V?: {
    TABNAME?: string;
    FIELDNAME?: string;
    FLDLOCATION?: string;
    ROLLNAME?: string;
  };
  DD32P_TABLE?: { item?: unknown };
  DD33V_TABLE?: { item?: unknown };
}): { name: string } & Record<string, unknown> {
  const paramItems = normalizeItems(DD32P_TABLE?.item);
  const assignItems = normalizeItems(DD33V_TABLE?.item);
  return {
    name: (DD30V?.SHLPNAME ?? '').toUpperCase(),
    type: 'SHLP/SH',
    description: DD30V?.DDTEXT,
    language: sapLangToIso(DD30V?.DDLANGUAGE),
    masterLanguage: sapLangToIso(DD30V?.DDLANGUAGE),
    helpType: DD30V?.SHLPTYPE,
    dialogType: DD30V?.DIALOGTYPE,
    textTable: DD31V
      ? {
          tableName: DD31V.TABNAME,
          fieldName: DD31V.FIELDNAME,
          fieldLocation: DD31V.FLDLOCATION,
          rollName: DD31V.ROLLNAME,
        }
      : undefined,
    parameters: paramItems.map(parseShlpParam),
    fieldAssignments: assignItems.map(parseShlpAssign),
  };
}
