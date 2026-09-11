/**
 * SSST (SAP Smart Form Style) handler for abapGit format
 */

import { ssst } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type SmartFormStyleLike = {
  name: string;
  masterLanguage?: string;
  fontFamily?: string;
};

export const smartFormStyleHandler = createHandler<SmartFormStyleLike, typeof ssst>(
  'SSST',
  {
    schema: ssst,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SSST',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      HEADER: {
        SSFNAME: String(obj.name ?? '').toUpperCase(),
        MASTERLANG: isoToSapLang(obj.masterLanguage),
        TDFAMILY: obj.fontFamily,
      },
    }),

    fromAbapGit: ({ HEADER }) => ({
      name: (HEADER?.SSFNAME ?? '').toUpperCase(),
      masterLanguage: sapLangToIso(HEADER?.MASTERLANG),
      fontFamily: HEADER?.TDFAMILY,
    }),
  },
);
