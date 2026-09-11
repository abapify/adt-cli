/**
 * SOD2 (ODS Object 2) handler for abapGit format
 */

import { sod2 } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type OdsObject2Like = {
  name: string;
  masterLanguage?: string;
};

export const odsObject2Handler = createHandler<OdsObject2Like, typeof sod2>(
  'SOD2',
  {
    schema: sod2,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SOD2',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SOD2: {
        METADATA: {
          NAME: String(obj.name ?? '').toUpperCase(),
          MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
        },
      },
    }),

    fromAbapGit: ({ SOD2 }) => ({
      name: (SOD2?.METADATA?.NAME ?? '').toUpperCase(),
      masterLanguage: sapLangToIso(SOD2?.METADATA?.MASTER_LANGUAGE),
    }),
  },
);
