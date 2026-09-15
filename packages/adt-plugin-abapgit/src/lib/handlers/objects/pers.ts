/**
 * PERS (Personalization Object) handler for abapGit format
 */

import { pers } from '../../../schemas/generated';
import { createHandler, normalizeItems, unwrapData } from '../base';
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

export const personalizationHandler = createHandler<
  PersonalizationObjLike,
  typeof pers
>('PERS', {
  schema: pers,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PERS',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<PersonalizationObjLike>(raw);
    return {
      PERS: {
        PERS_REG: {
          item: [
            {
              PERS_KEY: String(obj.name ?? '').toUpperCase(),
              ACCESS_CL: obj.accessClass,
              DISTRIB_CL: obj.distribClass,
              DIALOG_FB: obj.dialogFb,
              COMPONENT: obj.component,
              DATATYPE: obj.datatype,
              TYPENAME: obj.typename,
            },
          ],
        },
        PERS_REG_TEXT: {
          item: [
            {
              LANG: isoToSapLang(obj.language),
              PERS_KEY: String(obj.name ?? '').toUpperCase(),
              TEXT: obj.description,
            },
          ],
        },
      },
    };
  },

  fromAbapGit: ({ PERS }) => {
    const reg = normalizeItems(PERS?.PERS_REG?.item)[0];
    const text = normalizeItems(PERS?.PERS_REG_TEXT?.item)[0];
    return {
      name: (reg?.PERS_KEY ?? '').toUpperCase(),
      description: text?.TEXT,
      language: sapLangToIso(text?.LANG),
      accessClass: reg?.ACCESS_CL,
      distribClass: reg?.DISTRIB_CL,
      dialogFb: reg?.DIALOG_FB,
      component: reg?.COMPONENT,
      datatype: reg?.DATATYPE,
      typename: reg?.TYPENAME,
    };
  },
});
