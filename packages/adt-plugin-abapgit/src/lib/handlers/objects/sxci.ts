/**
 * SXCI (Classic BAdI Implementation) handler for abapGit format
 *
 * Classic BAdI implementations are XML-only. The abapGit format stores
 * implementation data under a single SXCI node.
 */

import { sxci } from '../../../schemas/generated';
import { createHandler } from '../base';

type BadiImplementationLike = {
  name: string;
  description?: string;
  implementationClass?: string;
  exitName?: string;
  interfaceName?: string;
  active?: boolean;
};

export const badiImplementationHandler = createHandler<
  BadiImplementationLike,
  typeof sxci
>('SXCI', {
  schema: sxci,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_SXCI',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    SXCI: {
      IMPLEMENTATION_DATA: {
        IMP_NAME: String(obj.name ?? '').toUpperCase(),
        TEXT: obj.description,
        IMP_CLASS: obj.implementationClass,
        EXIT_NAME: obj.exitName,
        INTER_NAME: obj.interfaceName,
        ACTIVE: obj.active ? 'X' : undefined,
      },
    },
  }),

  fromAbapGit: ({ SXCI }) => ({
    name: (SXCI?.IMPLEMENTATION_DATA?.IMP_NAME ?? '').toUpperCase(),
    description: SXCI?.IMPLEMENTATION_DATA?.TEXT,
    implementationClass: SXCI?.IMPLEMENTATION_DATA?.IMP_CLASS,
    exitName: SXCI?.IMPLEMENTATION_DATA?.EXIT_NAME,
    interfaceName: SXCI?.IMPLEMENTATION_DATA?.INTER_NAME,
    active: SXCI?.IMPLEMENTATION_DATA?.ACTIVE === 'X',
  }),
});
