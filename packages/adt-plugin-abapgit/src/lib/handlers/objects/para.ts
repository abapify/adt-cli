/**
 * PARA (SPA/GPA Parameter) handler for abapGit format
 */

import { para } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type SpagpaParamLike = {
  name: string;
  description?: string;
  language?: string;
};

export const spagpaParamHandler = createHandler<SpagpaParamLike, typeof para>(
  'PARA',
  {
    schema: para,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_PARA',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      const lang = isoToSapLang(obj.language);
      return {
        TPARA: { PARAMID: name, PARTEXT: obj.description },
        TPARAT: { PARAMID: name, SPRACHE: lang, PARTEXT: obj.description },
      };
    },

    fromAbapGit: ({ TPARA, TPARAT }) => ({
      name: (TPARA?.PARAMID ?? '').toUpperCase(),
      description: TPARAT?.PARTEXT ?? TPARA?.PARTEXT,
      language: sapLangToIso(TPARAT?.SPRACHE),
    }),
  },
);
