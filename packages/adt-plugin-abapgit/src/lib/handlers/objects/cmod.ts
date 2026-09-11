/**
 * CMOD (Customer Enhancement Project) handler for abapGit format
 */

import { cmod } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type EnhancementProjectLike = {
  name: string;
  members?: Array<{ name?: string; member?: string }>;
  texts?: Array<{ name?: string; language?: string; text?: string }>;
  attributes?: Array<{ name?: string; status?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const enhancementProjectHandler = createHandler<EnhancementProjectLike, typeof cmod>(
  'CMOD',
  {
    schema: cmod,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_CMOD',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      MODACT: obj.members?.length
        ? { item: obj.members.map((m) => ({ NAME: m.name, MEMBER: m.member })) }
        : undefined,
      MODTEXT: obj.texts?.length
        ? { item: obj.texts.map((t) => ({
            NAME: t.name,
            SPRAS: isoToSapLang(t.language),
            MODTEXT: t.text,
          })) }
        : undefined,
      MODATTR: obj.attributes?.length
        ? { item: obj.attributes.map((a) => ({ NAME: a.name, STATUS: a.status })) }
        : undefined,
    }),

    fromAbapGit: ({ MODACT, MODTEXT, MODATTR }) => {
      const members = normalizeItems(MODACT?.item);
      const texts = normalizeItems(MODTEXT?.item);
      const attrs = normalizeItems(MODATTR?.item);
      return {
        name: (members[0]?.NAME ?? '').toUpperCase(),
        members: members.map((m) => ({ name: m.NAME, member: m.MEMBER })),
        texts: texts.map((t) => ({
          name: t.NAME,
          language: sapLangToIso(t.SPRAS),
          text: t.MODTEXT,
        })),
        attributes: attrs.map((a) => ({ name: a.NAME, status: a.STATUS })),
      };
    },
  },
);
