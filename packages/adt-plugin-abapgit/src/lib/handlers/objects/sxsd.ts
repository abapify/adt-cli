/**
 * SXSD (BAdI Definition) handler for abapGit format
 */

import { sxsd } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type BadiDefinitionLike = {
  name: string;
  text?: string;
  interface?: string;
  masterLanguage?: string;
  extClassName?: string;
};

export const badiDefinitionHandler = createHandler<
  BadiDefinitionLike,
  typeof sxsd
>('SXSD', {
  schema: sxsd,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SXSD',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    SXSD: {
      BADI: {
        BADI_NAME: String(obj.name ?? '').toUpperCase(),
        TEXT: obj.text,
        INTERFACE: obj.interface,
      },
      MAST_LANGU: isoToSapLang(obj.masterLanguage),
      EXT_CLNAME: obj.extClassName,
    },
  }),

  fromAbapGit: ({ SXSD }) => ({
    name: (SXSD?.BADI?.BADI_NAME ?? '').toUpperCase(),
    text: SXSD?.BADI?.TEXT,
    interface: SXSD?.BADI?.INTERFACE,
    masterLanguage: sapLangToIso(SXSD?.MAST_LANGU),
    extClassName: SXSD?.EXT_CLNAME,
  }),
});
