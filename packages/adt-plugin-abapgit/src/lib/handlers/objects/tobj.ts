/**
 * TOBJ (Definition Maintenance and Transport Object) handler for abapGit format
 */

import { tobj } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type TransportObjectLike = {
  name: string;
  objectType?: string;
  description?: string;
  language?: string;
  clientDependent?: boolean;
  languageDependent?: boolean;
  category?: string;
  transportable?: boolean;
  tableName?: string;
  mainClass?: string;
  contClass?: string;
};

export const transportObjectHandler = createHandler<TransportObjectLike, typeof tobj>(
  'TOBJ',
  {
    schema: tobj,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_TOBJ',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      return {
        OBJH: {
          OBJECTNAME: name,
          OBJECTTYPE: obj.objectType ?? 'L',
          CLIDEP: obj.clientDependent ? 'X' : undefined,
          LANGDEP: obj.languageDependent ? 'X' : undefined,
          OBJCATEG: obj.category,
          OBJTRANSP: obj.transportable ? 'X' : undefined,
        },
        OBJT: {
          LANGUAGE: isoToSapLang(obj.language),
          OBJECTNAME: name,
          OBJECTTYPE: obj.objectType ?? 'L',
          DDTEXT: obj.description,
        },
        TOBJ: {
          TDDAT: {
            TABNAME: obj.tableName,
            MCLASS: obj.mainClass,
            CCLASS: obj.contClass,
          },
        },
      };
    },

    fromAbapGit: ({ OBJH, OBJT, TOBJ }) => ({
      name: (OBJH?.OBJECTNAME ?? '').toUpperCase(),
      objectType: OBJH?.OBJECTTYPE,
      description: OBJT?.DDTEXT,
      language: sapLangToIso(OBJT?.LANGUAGE),
      clientDependent: OBJH?.CLIDEP === 'X',
      languageDependent: OBJH?.LANGDEP === 'X',
      category: OBJH?.OBJCATEG,
      transportable: OBJH?.OBJTRANSP === 'X',
      tableName: TOBJ?.TDDAT?.TABNAME,
      mainClass: TOBJ?.TDDAT?.MCLASS,
      contClass: TOBJ?.TDDAT?.CCLASS,
    }),
  },
);
