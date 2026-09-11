/**
 * SHI3 (Hierarchy Display) handler for abapGit format
 */

import { shi3 } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type HierarchyDisplayLike = {
  name: string;
  type?: string;
  titles?: Array<{ language?: string; text?: string }>;
  nodes?: Array<{ nodeId?: string; parentId?: string; text?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const hierarchyDisplayHandler = createHandler<HierarchyDisplayLike, typeof shi3>(
  'SHI3',
  {
    schema: shi3,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SHI3',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      TREE_HEAD: {
        TREE_ID: String(obj.name ?? '').toUpperCase(),
        TYPE: obj.type,
      },
      TREE_TITLES: obj.titles?.length
        ? { item: obj.titles.map((t) => ({
            SPRAS: isoToSapLang(t.language),
            TREE_ID: String(obj.name ?? '').toUpperCase(),
            TEXT: t.text,
          })) }
        : undefined,
      TREE_NODES: obj.nodes?.length
        ? { item: obj.nodes.map((n) => ({
            NODE_ID: n.nodeId,
            TREE_ID: String(obj.name ?? '').toUpperCase(),
            PARENT_ID: n.parentId,
            TEXT: n.text,
          })) }
        : undefined,
    }),

    fromAbapGit: ({ TREE_HEAD, TREE_TITLES, TREE_NODES }) => {
      const titles = normalizeItems(TREE_TITLES?.item);
      const nodes = normalizeItems(TREE_NODES?.item);
      return {
        name: (TREE_HEAD?.TREE_ID ?? '').toUpperCase(),
        type: TREE_HEAD?.TYPE,
        titles: titles.map((t) => ({
          language: sapLangToIso(t.SPRAS),
          text: t.TEXT,
        })),
        nodes: nodes.map((n) => ({
          nodeId: n.NODE_ID,
          parentId: n.PARENT_ID,
          text: n.TEXT,
        })),
      };
    },
  },
);
