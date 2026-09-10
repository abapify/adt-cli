/**
 * SHMA (Shared Memory Area) handler for abapGit format
 *
 * Shared memory areas are XML-only. The abapGit format stores area
 * attributes under a SHMA node.
 */

import { shma } from '../../../schemas/generated';
import { createHandler } from '../base';

type SharedMemoryAreaLike = {
  name: string;
  description?: string;
  root?: string;
  autoBuild?: string;
  hasVersions?: string;
  transactional?: string;
  clientDependent?: string;
  lifeContext?: string;
  propagationKind?: string;
  displaceKind?: string;
};

export const sharedMemoryAreaHandler = createHandler<
  SharedMemoryAreaLike,
  typeof shma
>('SHMA', {
  schema: shma,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SHMA',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    SHMA: {
      AREA_NAME: String(obj.name ?? '').toUpperCase(),
      DESCRIPT: obj.description,
      ROOT: obj.root,
      AUTO_BUILD: obj.autoBuild,
      HAS_VERSIONS: obj.hasVersions,
      TRANSACTIONAL: obj.transactional,
      CLIENT_DEPENDENT: obj.clientDependent,
      LIFE_CONTEXT: obj.lifeContext,
      PROPAGATION_KIND: obj.propagationKind,
      DISPLACE_KIND: obj.displaceKind,
    },
  }),

  fromAbapGit: ({ SHMA }) => ({
    name: (SHMA?.AREA_NAME ?? '').toUpperCase(),
    description: SHMA?.DESCRIPT,
    root: SHMA?.ROOT,
    autoBuild: SHMA?.AUTO_BUILD,
    hasVersions: SHMA?.HAS_VERSIONS,
    transactional: SHMA?.TRANSACTIONAL,
    clientDependent: SHMA?.CLIENT_DEPENDENT,
    lifeContext: SHMA?.LIFE_CONTEXT,
    propagationKind: SHMA?.PROPAGATION_KIND,
    displaceKind: SHMA?.DISPLACE_KIND,
  }),
});
