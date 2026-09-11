/**
 * SHI5 (Hierarchy Maintenance Extension) handler for abapGit format
 */

import { shi5 } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type HierarchyExtensionLike = {
  name: string;
  treeId?: string;
  texts?: Array<{ language?: string; text?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const hierarchyExtensionHandler = createHandler<HierarchyExtensionLike, typeof shi5>(
  'SHI5',
  {
    schema: shi5,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SHI5',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SHI5: {
        HEADER: {
          EXT_ID: String(obj.name ?? '').toUpperCase(),
          TREE_ID: obj.treeId,
        },
        TEXTS: obj.texts?.length
          ? { item: obj.texts.map((t) => ({
              SPRAS: isoToSapLang(t.language),
              EXT_ID: String(obj.name ?? '').toUpperCase(),
              TEXT: t.text,
            })) }
          : undefined,
      },
    }),

    fromAbapGit: ({ SHI5 }) => {
      const texts = normalizeItems(SHI5?.TEXTS?.item);
      return {
        name: (SHI5?.HEADER?.EXT_ID ?? '').toUpperCase(),
        treeId: SHI5?.HEADER?.TREE_ID,
        texts: texts.map((t) => ({
          language: sapLangToIso(t.SPRAS),
          text: t.TEXT,
        })),
      };
    },
  },
);
