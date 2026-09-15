/**
 * SUSC (SAP Authorization Object Class) handler for abapGit format
 *
 * Authorization object classes are XML-only. The abapGit format stores
 * TOBC (class header) and TOBCT (class text) nodes.
 */

import { susc } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type AuthObjectClassLike = {
  name: string;
  description?: string;
  language?: string;
};

export const authObjectClassHandler = createHandler<
  AuthObjectClassLike,
  typeof susc
>('SUSC', {
  schema: susc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SUSC',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    TOBC: {
      OCLSS: String(obj.name ?? '').toUpperCase(),
    },
    TOBCT: {
      LANGU: isoToSapLang(obj.language),
      OCLSS: String(obj.name ?? '').toUpperCase(),
      CTEXT: obj.description,
    },
  }),

  fromAbapGit: ({ TOBC, TOBCT }) => ({
    name: (TOBC?.OCLSS ?? TOBCT?.OCLSS ?? '').toUpperCase(),
    description: TOBCT?.CTEXT,
    language: sapLangToIso(TOBCT?.LANGU),
  }),
});
