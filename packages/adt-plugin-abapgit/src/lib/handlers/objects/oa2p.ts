/**
 * OA2P (OAuth 2.0 Profile) handler for abapGit format
 */

import { oa2p } from '../../../schemas/generated';
import { createHandler } from '../base';

type Oauth2ProfileLike = {
  name: string;
  profile?: string;
  type?: string;
  scopes?: Array<{ scope?: string; description?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const oauth2ProfileHandler = createHandler<Oauth2ProfileLike, typeof oa2p>(
  'OA2P',
  {
    schema: oa2p,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_OA2P',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      PROFILE: {
        PROFILE: obj.profile ?? String(obj.name ?? '').toUpperCase(),
        TYPE: obj.type,
        T_SCOPES: obj.scopes?.length
          ? { item: obj.scopes.map((s) => ({ SCOPE: s.scope, DESCRIPTION: s.description })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ PROFILE }) => {
      const scopes = normalizeItems(PROFILE?.T_SCOPES?.item);
      return {
        name: (PROFILE?.PROFILE ?? '').toUpperCase(),
        profile: PROFILE?.PROFILE,
        type: PROFILE?.TYPE,
        scopes: scopes.map((s) => ({ scope: s.SCOPE, description: s.DESCRIPTION })),
      };
    },
  },
);
