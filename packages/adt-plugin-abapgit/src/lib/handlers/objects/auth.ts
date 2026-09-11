/**
 * AUTH (Authorization Field) handler for abapGit format
 */

import { auth } from '../../../schemas/generated';
import { createHandler } from '../base';

type AuthFieldLike = {
  name: string;
  rollName?: string;
  authClass?: string;
  datatype?: string;
  length?: string;
  outputLength?: string;
  lowercase?: boolean;
};

export const authFieldHandler = createHandler<AuthFieldLike, typeof auth>(
  'AUTH',
  {
    schema: auth,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_AUTH',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      AUTHX: {
        FIELDNAME: String(obj.name ?? '').toUpperCase(),
        ROLLNAME: obj.rollName,
        AUTHCLASS: obj.authClass,
        DATATYPE: obj.datatype,
        LENG: obj.length,
        OUTPUTLEN: obj.outputLength,
        LOWERCASE: obj.lowercase ? 'X' : undefined,
      },
    }),

    fromAbapGit: ({ AUTHX }) => ({
      name: (AUTHX?.FIELDNAME ?? '').toUpperCase(),
      rollName: AUTHX?.ROLLNAME,
      authClass: AUTHX?.AUTHCLASS,
      datatype: AUTHX?.DATATYPE,
      length: AUTHX?.LENG,
      outputLength: AUTHX?.OUTPUTLEN,
      lowercase: AUTHX?.LOWERCASE === 'X',
    }),
  },
);
