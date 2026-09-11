/**
 * PERS (Personalization Object) handler for abapGit format
 */

import { pers } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type PersonalizationObjLike = {
  name: string;
  description?: string;
  language?: string;
  accessClass?: string;
  distribClass?: string;
  dialogFb?: string;
  component?: string;
  datatype?: string;
  typename?: string;
};

export const personalizationHandler = createHandler<PersonalizationObjLike, typeof pers>(
  'PERS',
  {
    schema: pers,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_PERS',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      PERS: {
        PERS_REG: {
          PERS_KEY: String(obj.name ?? '').toUpperCase(),
          ACCESS_CL: obj.accessClass,
          DISTRIB_CL: obj.distribClass,
          DIALOG_FB: obj.dialogFb,
          COMPONENT: obj.component,
          DATATYPE: obj.datatype,
          TYPENAME: obj.typename,
        },
        PERS_REG_TEXT: {
          LANG: isoToSapLang(obj.language),
          PERS_KEY: String(obj.name ?? '').toUpperCase(),
          TEXT: obj.description,
        },
      },
    }),

    fromAbapGit: ({ PERS }) => ({
      name: (PERS?.PERS_REG?.PERS_KEY ?? '').toUpperCase(),
      description: PERS?.PERS_REG_TEXT?.TEXT,
      language: sapLangToIso(PERS?.PERS_REG_TEXT?.LANG),
      accessClass: PERS?.PERS_REG?.ACCESS_CL,
      distribClass: PERS?.PERS_REG?.DISTRIB_CL,
      dialogFb: PERS?.PERS_REG?.DIALOG_FB,
      component: PERS?.PERS_REG?.COMPONENT,
      datatype: PERS?.PERS_REG?.DATATYPE,
      typename: PERS?.PERS_REG?.TYPENAME,
    }),
  },
);
