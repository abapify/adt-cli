/**
 * AVAS (Variant Assignment) handler for abapGit format
 */

import { avas } from '../../../schemas/generated';
import { createHandler } from '../base';

type VariantAssignmentLike = {
  name: string;
  guid?: string;
  attribute?: string;
  object?: string;
};

export const variantAssignmentHandler = createHandler<VariantAssignmentLike, typeof avas>(
  'AVAS',
  {
    schema: avas,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_AVAS',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      AVAS: {
        HEADER: {
          GUID: obj.guid,
          ATTRIBUTE: obj.attribute,
          OBJECT: obj.object,
        },
      },
    }),

    fromAbapGit: ({ AVAS }) => ({
      name: '',
      guid: AVAS?.HEADER?.GUID,
      attribute: AVAS?.HEADER?.ATTRIBUTE,
      object: AVAS?.HEADER?.OBJECT,
    }),
  },
);
