/**
 * DIAL (Dialog Module) handler for abapGit format
 */

import { dial } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type DialogModuleLike = {
  name: string;
  language?: string;
  description?: string;
};

export const dialogModuleHandler = createHandler<DialogModuleLike, typeof dial>(
  'DIAL',
  {
    schema: dial,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_DIAL',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      DIAL: {
        TDCT: {
          DIALOGNAME: String(obj.name ?? '').toUpperCase(),
          SPRAS: isoToSapLang(obj.language),
          DDTEXT: obj.description,
        },
      },
    }),

    fromAbapGit: ({ DIAL }) => ({
      name: (DIAL?.TDCT?.DIALOGNAME ?? '').toUpperCase(),
      language: sapLangToIso(DIAL?.TDCT?.SPRAS),
      description: DIAL?.TDCT?.DDTEXT,
    }),
  },
);
