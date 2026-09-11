/**
 * SUSO (Authorization Object) handler for abapGit format
 *
 * Authorization objects are XML-only. The abapGit format stores
 * TOBJ (object header) and TOBJT (object text) nodes.
 */

import { suso } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type AuthObjectLike = {
  name: string;
  description?: string;
  language?: string;
  fields?: string[];
  authClass?: string;
};

export const authObjectHandler = createHandler<AuthObjectLike, typeof suso>(
  'SUSO',
  {
    schema: suso,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SUSO',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      const fields = obj.fields ?? [];
      return {
        TOBJ: {
          OBJCT: name,
          FIEL1: fields[0],
          FIEL2: fields[1],
          FIEL3: fields[2],
          FIEL4: fields[3],
          FIEL5: fields[4],
          FIEL6: fields[5],
          FIEL7: fields[6],
          FIEL8: fields[7],
          FIEL9: fields[8],
          FIEL0: fields[9],
          OCLSS: obj.authClass,
        },
        TOBJT: {
          LANGU: isoToSapLang(obj.language),
          OBJECT: name,
          TTEXT: obj.description,
        },
      };
    },

    fromAbapGit: ({ TOBJ, TOBJT }) => {
      const fields = [
        TOBJ?.FIEL1, TOBJ?.FIEL2, TOBJ?.FIEL3, TOBJ?.FIEL4, TOBJ?.FIEL5,
        TOBJ?.FIEL6, TOBJ?.FIEL7, TOBJ?.FIEL8, TOBJ?.FIEL9, TOBJ?.FIEL0,
      ].filter(Boolean) as string[];
      return {
        name: (TOBJ?.OBJCT ?? '').toUpperCase(),
        description: TOBJT?.TTEXT,
        language: sapLangToIso(TOBJT?.LANGU),
        fields,
        authClass: TOBJ?.OCLSS,
      };
    },
  },
);
