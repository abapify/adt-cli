/**
 * SOD1 (ODS Object 1) handler for abapGit format
 */

import { sod1 } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type OdsObject1Like = {
  name: string;
  masterLanguage?: string;
};

export const odsObject1Handler = createHandler<OdsObject1Like, typeof sod1>(
  'SOD1',
  {
    schema: sod1,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SOD1',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SOD1: {
        METADATA: {
          NAME: String(obj.name ?? '').toUpperCase(),
          MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
        },
      },
    }),

    fromAbapGit: ({ SOD1 }) => ({
      name: (SOD1?.METADATA?.NAME ?? '').toUpperCase(),
      masterLanguage: sapLangToIso(SOD1?.METADATA?.MASTER_LANGUAGE),
    }),
  },
);
