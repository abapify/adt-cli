/**
 * SUCU (Customer Authorization Group) handler for abapGit format
 *
 * Uses the generic serializer. The abapGit format stores
 * TBRG_AUTH (authorization groups) and TBRG_AUTHT (texts) nodes.
 */

import { sucu } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type AuthGroupLike = {
  name: string;
  object?: string;
  description?: string;
  language?: string;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const authGroupHandler = createHandler<AuthGroupLike, typeof sucu>(
  'SUCU',
  {
    schema: sucu,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SUCU',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => {
      const name = String(obj.name ?? '').toUpperCase();
      return {
        TBRG_AUTH: {
          item: [{ BRGRU: name, OBJECT: obj.object }],
        },
        TBRG_AUTHT: {
          item: [
            {
              SPRAS: isoToSapLang(obj.language),
              BRGRU: name,
              OBJECT: obj.object,
              BEZEI: obj.description,
            },
          ],
        },
      };
    },

    fromAbapGit: ({ TBRG_AUTH, TBRG_AUTHT }) => {
      const auths = normalizeItems(TBRG_AUTH?.item);
      const texts = normalizeItems(TBRG_AUTHT?.item);
      const firstAuth = auths[0];
      const firstText = texts[0];
      return {
        name: (firstAuth?.BRGRU ?? '').toUpperCase(),
        object: firstAuth?.OBJECT,
        description: firstText?.BEZEI,
        language: sapLangToIso(firstText?.SPRAS),
      };
    },
  },
);
