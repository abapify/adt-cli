/**
 * AVAR (Activation Variant) handler for abapGit format
 */

import { avar } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';

type ActivationVariantLike = {
  name: string;
  description?: string;
  ids?: Array<{ objName?: string; objType?: string; active?: boolean }>;
};

export const activationVariantHandler = createHandler<
  ActivationVariantLike,
  typeof avar
>('AVAR', {
  schema: avar,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_AVAR',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DESCRIPTION: obj.description,
    IDS: obj.ids?.length
      ? {
          item: obj.ids.map((i) => ({
            OBJ_NAME: i.objName,
            OBJ_TYPE: i.objType,
            ACTIVE: i.active ? 'X' : undefined,
          })),
        }
      : undefined,
  }),

  fromAbapGit: ({ DESCRIPTION, IDS }) => {
    const ids = normalizeItems(IDS?.item);
    return {
      name: '',
      description: DESCRIPTION,
      ids: mapItems(ids, (i) => ({
        objName: i.OBJ_NAME,
        objType: i.OBJ_TYPE,
        active: i.ACTIVE === 'X',
      })),
    };
  },
});
