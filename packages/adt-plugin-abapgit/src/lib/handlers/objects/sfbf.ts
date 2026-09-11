/**
 * SFBF (Business Function) handler for abapGit format
 */

import { sfbf } from '../../../schemas/generated';
import { createHandler } from '../base';

type BusinessFunctionLike = {
  name: string;
  name32?: string;
  name80?: string;
  assignedSwitches?: string[];
  parentBfs?: string[];
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const businessFunctionHandler = createHandler<BusinessFunctionLike, typeof sfbf>(
  'SFBF',
  {
    schema: sfbf,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SFBF',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      HEADER: {
        BF_NAME: String(obj.name ?? '').toUpperCase(),
      },
      NAME32: obj.name32,
      NAME80: obj.name80,
      ASSIGNED_SWITCHES: obj.assignedSwitches?.length
        ? { item: obj.assignedSwitches.map((s) => ({ SWITCH: s })) }
        : undefined,
      PARENT_BFS: obj.parentBfs?.length
        ? { item: obj.parentBfs.map((b) => ({ BF: b })) }
        : undefined,
    }),

    fromAbapGit: ({ HEADER, NAME32, NAME80, ASSIGNED_SWITCHES, PARENT_BFS }) => {
      const switches = normalizeItems(ASSIGNED_SWITCHES?.item);
      const parentBfs = normalizeItems(PARENT_BFS?.item);
      return {
        name: (HEADER?.BF_NAME ?? '').toUpperCase(),
        name32: NAME32,
        name80: NAME80,
        assignedSwitches: switches.map((s) => s.SWITCH ?? ''),
        parentBfs: parentBfs.map((b) => b.BF ?? ''),
      };
    },
  },
);
