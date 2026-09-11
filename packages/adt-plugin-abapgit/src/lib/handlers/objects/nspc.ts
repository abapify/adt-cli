/**
 * NSPC (Namespace) handler for abapGit format
 */

import { nspc } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type NamespaceLike = {
  name: string;
  replicense?: string;
  sscrflag?: boolean;
  sapflag?: boolean;
  genOnly?: boolean;
  description?: string;
  language?: string;
  owner?: string;
};

export const namespaceHandler = createHandler<NamespaceLike, typeof nspc>(
  'NSPC',
  {
    schema: nspc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_NSPC',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      NSPC: {
        NAMESPACE: String(obj.name ?? '').toUpperCase(),
        REPLICENSE: obj.replicense,
        SSCRFLAG: obj.sscrflag ? 'X' : undefined,
        SAPFLAG: obj.sapflag ? 'X' : undefined,
        GEN_ONLY: obj.genOnly ? 'X' : undefined,
      },
      NSPC_TEXT: {
        SPRAS: isoToSapLang(obj.language),
        DESCRIPTN: obj.description,
        OWNER: obj.owner,
      },
    }),

    fromAbapGit: ({ NSPC, NSPC_TEXT }) => ({
      name: (NSPC?.NAMESPACE ?? '').toUpperCase(),
      replicense: NSPC?.REPLICENSE,
      sscrflag: NSPC?.SSCRFLAG === 'X',
      sapflag: NSPC?.SAPFLAG === 'X',
      genOnly: NSPC?.GEN_ONLY === 'X',
      description: NSPC_TEXT?.DESCRIPTN,
      language: sapLangToIso(NSPC_TEXT?.SPRAS),
      owner: NSPC_TEXT?.OWNER,
    }),
  },
);
