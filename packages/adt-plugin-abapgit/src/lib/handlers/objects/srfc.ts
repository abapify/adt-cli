/**
 * SRFC (RFC Service / UCON RFC Service) handler for abapGit format
 *
 * RFC services are XML-only. The abapGit format stores the UCONRFC
 * complete data structure under a single SRFC node.
 */

import { srfc } from '../../../schemas/generated';
import { createHandler } from '../base';

type RfcServiceLike = {
  name: string;
  description?: string;
  funcname?: string;
  scope?: string;
  version?: string;
};

export const rfcServiceHandler = createHandler<RfcServiceLike, typeof srfc>(
  'SRFC',
  {
    schema: srfc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SRFC',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SRFC: {
        ID: String(obj.name ?? '').toUpperCase(),
        VERSION: obj.version ?? 'A',
        SCOPE: obj.scope,
        FUNCNAME: obj.funcname,
        TEXT: obj.description,
      },
    }),

    fromAbapGit: ({ SRFC }) => ({
      name: (SRFC?.ID ?? '').toUpperCase(),
      description: SRFC?.TEXT,
      funcname: SRFC?.FUNCNAME,
      scope: SRFC?.SCOPE,
      version: SRFC?.VERSION,
    }),
  },
);
