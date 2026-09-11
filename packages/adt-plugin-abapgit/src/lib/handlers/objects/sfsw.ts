/**
 * SFSW (Switch Framework Switch) handler for abapGit format
 */

import { sfsw } from '../../../schemas/generated';
import { createHandler } from '../base';

type SwitchLike = {
  name: string;
  name32?: string;
  name80?: string;
  parentBfs?: string[];
  conflicts?: string[];
  packages?: string[];
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const switchHandler = createHandler<SwitchLike, typeof sfsw>(
  'SFSW',
  {
    schema: sfsw,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SFSW',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      HEADER: {
        SWITCH_ID: String(obj.name ?? '').toUpperCase(),
      },
      NAME32: obj.name32,
      NAME80: obj.name80,
      PARENT_BF: obj.parentBfs?.length
        ? { item: obj.parentBfs.map((b) => ({ BF: b })) }
        : undefined,
      CONFLICTS: obj.conflicts?.length
        ? { item: obj.conflicts.map((c) => ({ CONFLICT: c })) }
        : undefined,
      PACKAGES: obj.packages?.length
        ? { item: obj.packages.map((p) => ({ PACKAGE: p })) }
        : undefined,
    }),

    fromAbapGit: ({ HEADER, NAME32, NAME80, PARENT_BF, CONFLICTS, PACKAGES }) => {
      const parentBfs = normalizeItems(PARENT_BF?.item);
      const conflicts = normalizeItems(CONFLICTS?.item);
      const packages = normalizeItems(PACKAGES?.item);
      return {
        name: (HEADER?.SWITCH_ID ?? '').toUpperCase(),
        name32: NAME32,
        name80: NAME80,
        parentBfs: parentBfs.map((p) => p.BF ?? ''),
        conflicts: conflicts.map((c) => c.CONFLICT ?? ''),
        packages: packages.map((p) => p.PACKAGE ?? ''),
      };
    },
  },
);
