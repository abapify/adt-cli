/**
 * Table Type (TTYP) object handler for abapGit format
 */

import { AdkTableType } from '../adk';
import { ttyp } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

export const tableTypeHandler = createHandler(AdkTableType, {
  schema: ttyp,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_TTYP',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const data = obj.dataSync;
    return {
      DD40V: {
        TYPENAME: obj.name ?? '',
        DDLANGUAGE: isoToSapLang(data?.language || undefined),
        ROWTYPE: data?.rowType?.typeName ?? '',
        ROWKIND: data?.rowType?.typeKind ?? '',
        DATATYPE: data?.rowType?.builtInType?.dataType ?? '',
        ACCESSMODE: data?.accessType ?? '',
        KEYDEF: data?.primaryKey?.definition ?? '',
        KEYKIND: data?.primaryKey?.kind ?? '',
        DDTEXT: obj.description ?? '',
      },
    };
  },

  fromAbapGit: ({ DD40V }) =>
    ({
      name: (DD40V?.TYPENAME ?? '').toUpperCase(),
      type: 'TTYP/TT',
      description: DD40V?.DDTEXT,
      language: sapLangToIso(DD40V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD40V?.DDLANGUAGE),
    }) as { name: string } & Record<string, unknown>,
});
