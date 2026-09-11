/**
 * STVI (Transaction Variant) handler for abapGit format
 */

import { stvi } from '../../../schemas/generated';
import { createHandler } from '../base';

type TransactionVariantLike = {
  name: string;
  tcode?: string;
  variant?: string;
  text?: string;
};

export const transactionVariantHandler = createHandler<TransactionVariantLike, typeof stvi>(
  'STVI',
  {
    schema: stvi,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_STVI',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      STVI: {
        SHDTVCIU: {
          TCODE: obj.tcode,
          VARIANT: obj.variant ?? String(obj.name ?? '').toUpperCase(),
          TEXT: obj.text,
        },
      },
    }),

    fromAbapGit: ({ STVI }) => ({
      name: (STVI?.SHDTVCIU?.VARIANT ?? '').toUpperCase(),
      tcode: STVI?.SHDTVCIU?.TCODE,
      variant: STVI?.SHDTVCIU?.VARIANT,
      text: STVI?.SHDTVCIU?.TEXT,
    }),
  },
);
