/**
 * SHI8 (Hierarchy Switch Assignment) handler for abapGit format
 */

import { shi8 } from '../../../schemas/generated';
import { createHandler } from '../base';

type HierarchySwitchAssignmentLike = {
  name: string;
  switchId?: string;
  reaction?: string;
  treeId?: string;
  nodeId?: string;
};

export const hierarchySwitchAssignmentHandler = createHandler<HierarchySwitchAssignmentLike, typeof shi8>(
  'SHI8',
  {
    schema: shi8,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SHI8',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SHI8: {
        SFW_ASS_ID: String(obj.name ?? '').toUpperCase(),
        SWITCH_ID: obj.switchId,
        REACTION: obj.reaction,
        TREE_ID: obj.treeId,
        NODE_ID: obj.nodeId,
      },
    }),

    fromAbapGit: ({ SHI8 }) => ({
      name: (SHI8?.SFW_ASS_ID ?? '').toUpperCase(),
      switchId: SHI8?.SWITCH_ID,
      reaction: SHI8?.REACTION,
      treeId: SHI8?.TREE_ID,
      nodeId: SHI8?.NODE_ID,
    }),
  },
);
