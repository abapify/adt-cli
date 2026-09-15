/**
 * SSST (SAP Smart Form Style) handler for abapGit format
 */

import { ssst } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type SmartFormStyleLike = {
  name: string;
  masterLanguage?: string;
  fontFamily?: string;
  ssfparas?: unknown;
  ssfstrings?: unknown;
  stxstab?: unknown;
};

export const smartFormStyleHandler = createHandler<
  SmartFormStyleLike,
  typeof ssst
>('SSST', {
  schema: ssst,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SSST',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<SmartFormStyleLike>(raw);
    return {
      HEADER: {
        SSFNAME: String(obj.name ?? '').toUpperCase(),
        MASTERLANG: isoToSapLang(obj.masterLanguage),
        TDFAMILY: obj.fontFamily,
      },
      SSFPARAS: obj.ssfparas,
      SSFSTRINGS: obj.ssfstrings,
      STXSTAB: obj.stxstab,
    };
  },

  fromAbapGit: ({ HEADER, SSFPARAS, SSFSTRINGS, STXSTAB }) => ({
    name: (HEADER?.SSFNAME ?? '').toUpperCase(),
    masterLanguage: sapLangToIso(HEADER?.MASTERLANG),
    fontFamily: HEADER?.TDFAMILY,
    ssfparas: SSFPARAS,
    ssfstrings: SSFSTRINGS,
    stxstab: STXSTAB,
  }),
});
