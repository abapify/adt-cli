/**
 * SCVI (Screen Variant) handler for abapGit format
 */

import { scvi } from '../../../schemas/generated';
import { createHandler } from '../base';

type ScreenVariantLike = {
  name: string;
  tcode?: string;
  screen?: string;
  variant?: string;
  text?: string;
};

export const screenVariantHandler = createHandler<ScreenVariantLike, typeof scvi>(
  'SCVI',
  {
    schema: scvi,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SCVI',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SCVI: {
        SHDSVCI: {
          TCODE: obj.tcode,
          SCREEN: obj.screen,
          VARIANT: obj.variant ?? String(obj.name ?? '').toUpperCase(),
          TEXT: obj.text,
        },
      },
    }),

    fromAbapGit: ({ SCVI }) => ({
      name: (SCVI?.SHDSVCI?.VARIANT ?? '').toUpperCase(),
      tcode: SCVI?.SHDSVCI?.TCODE,
      screen: SCVI?.SHDSVCI?.SCREEN,
      variant: SCVI?.SHDSVCI?.VARIANT,
      text: SCVI?.SHDSVCI?.TEXT,
    }),
  },
);
