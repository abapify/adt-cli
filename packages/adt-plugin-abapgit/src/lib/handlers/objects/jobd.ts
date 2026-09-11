/**
 * JOBD (Job Definition) handler for abapGit format
 */

import { jobd } from '../../../schemas/generated';
import { createHandler } from '../base';

type JobDefinitionLike = {
  name: string;
  repid?: string;
  packageName?: string;
  jobCount?: string;
  jobClass?: string;
  targetSystem?: string;
};

export const jobDefinitionHandler = createHandler<JobDefinitionLike, typeof jobd>(
  'JOBD',
  {
    schema: jobd,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_JOBD',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      JOBD: {
        JOBNAME: String(obj.name ?? '').toUpperCase(),
        REPID: obj.repid,
        JDPACKAGE: obj.packageName,
        JOBCOUNT: obj.jobCount,
        JOBCLASS: obj.jobClass,
        BTCSYS: obj.targetSystem,
      },
    }),

    fromAbapGit: ({ JOBD }) => ({
      name: (JOBD?.JOBNAME ?? '').toUpperCase(),
      repid: JOBD?.REPID,
      packageName: JOBD?.JDPACKAGE,
      jobCount: JOBD?.JOBCOUNT,
      jobClass: JOBD?.JOBCLASS,
      targetSystem: JOBD?.BTCSYS,
    }),
  },
);
