/**
 * AMSD (AMDP Logical DB Schema) handler for abapGit format
 */

import { amsd } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type AmdpSchemaLike = {
  name: string;
  masterLanguage?: string;
  packageName?: string;
};

export const amdpSchemaHandler = createHandler<AmdpSchemaLike, typeof amsd>(
  'AMSD',
  {
    schema: amsd,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_AMSD',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<AmdpSchemaLike>(raw);
      return {
        AMSD: {
          METADATA: {
            NAME: String(obj.name ?? '').toUpperCase(),
            MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
            PACKAGE_REF: obj.packageName,
          },
        },
      };
    },

    fromAbapGit: ({ AMSD }) => ({
      name: (AMSD?.METADATA?.NAME ?? '').toUpperCase(),
      masterLanguage: sapLangToIso(AMSD?.METADATA?.MASTER_LANGUAGE),
      packageName: AMSD?.METADATA?.PACKAGE_REF,
    }),
  },
);
