/**
 * Table/Structure (TABL) object handler for abapGit format
 */

import { AdkTable } from '../adk';
import { tabl } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

export const tableHandler = createHandler(AdkTable, {
  schema: tabl,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_TABL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DD02V: {
      TABNAME: obj.name ?? '',
      DDLANGUAGE: isoToSapLang(obj.language || undefined),
      TABCLASS: (obj.dataSync as any)?.tabClass ?? '',
      DDTEXT: obj.description ?? '',
      EXCLASS: (obj.dataSync as any)?.exclass ?? '',
    },
  }),

  fromAbapGit: ({ DD02V }) =>
    ({
      name: (DD02V?.TABNAME ?? '').toUpperCase(),
      type: DD02V?.TABCLASS === 'INTTAB' ? 'TABL/DS' : 'TABL/DT',
      description: DD02V?.DDTEXT,
      language: sapLangToIso(DD02V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD02V?.DDLANGUAGE),
    }) as { name: string } & Record<string, unknown>,
});
