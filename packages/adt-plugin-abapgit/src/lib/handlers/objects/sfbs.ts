/**
 * SFBS (Business Function Set) handler for abapGit format
 */

import { sfbs } from '../../../schemas/generated';
import { createHandler } from '../base';

type BusinessFunctionSetLike = {
  name: string;
  name32?: string;
  name80?: string;
  assignedBfs?: string[];
  nestedBfs?: string[];
  parentBfs?: string[];
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const businessFunctionSetHandler = createHandler<BusinessFunctionSetLike, typeof sfbs>(
  'SFBS',
  {
    schema: sfbs,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SFBS',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      HEADER: {
        BS_NAME: String(obj.name ?? '').toUpperCase(),
      },
      NAME32: obj.name32,
      NAME80: obj.name80,
      ASSIGNED_BF: obj.assignedBfs?.length
        ? { item: obj.assignedBfs.map((b) => ({ BF: b })) }
        : undefined,
      NESTED_BFS: obj.nestedBfs?.length
        ? { item: obj.nestedBfs.map((b) => ({ BFS: b })) }
        : undefined,
      PARENT_BFS: obj.parentBfs?.length
        ? { item: obj.parentBfs.map((b) => ({ BFS: b })) }
        : undefined,
    }),

    fromAbapGit: ({ HEADER, NAME32, NAME80, ASSIGNED_BF, NESTED_BFS, PARENT_BFS }) => {
      const assignedBfs = normalizeItems(ASSIGNED_BF?.item);
      const nestedBfs = normalizeItems(NESTED_BFS?.item);
      const parentBfs = normalizeItems(PARENT_BFS?.item);
      return {
        name: (HEADER?.BS_NAME ?? '').toUpperCase(),
        name32: NAME32,
        name80: NAME80,
        assignedBfs: assignedBfs.map((b) => b.BF ?? ''),
        nestedBfs: nestedBfs.map((b) => b.BFS ?? ''),
        parentBfs: parentBfs.map((b) => b.BFS ?? ''),
      };
    },
  },
);
