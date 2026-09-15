/**
 * FTGL (Feature Toggle) handler for abapGit format
 */

import { ftgl } from '../../../schemas/generated';
import { createHandler } from '../base';

type FeatureToggleLike = {
  name: string;
  description?: string;
  status?: string;
};

export const featureToggleHandler = createHandler<
  FeatureToggleLike,
  typeof ftgl
>('FTGL', {
  schema: ftgl,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_FTGL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    FTGL: {
      HEADER: {
        FEATURE_ID: String(obj.name ?? '').toUpperCase(),
        DESCRIPTION: obj.description,
        STATUS: obj.status,
      },
    },
  }),

  fromAbapGit: ({ FTGL }) => ({
    name: (FTGL?.HEADER?.FEATURE_ID ?? '').toUpperCase(),
    description: FTGL?.HEADER?.DESCRIPTION,
    status: FTGL?.HEADER?.STATUS,
  }),
});
