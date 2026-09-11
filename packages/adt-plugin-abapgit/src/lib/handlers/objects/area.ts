/**
 * AREA (InfoArea) handler for abapGit format
 */

import { area } from '../../../schemas/generated';
import { createHandler } from '../base';

type InfoAreaLike = {
  name: string;
  parentName?: string;
  shortText?: string;
  longText?: string;
};

export const infoAreaHandler = createHandler<InfoAreaLike, typeof area>(
  'AREA',
  {
    schema: area,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_AREA',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      NODENAME: String(obj.name ?? '').toUpperCase(),
      PARENTNAME: obj.parentName,
      TXTSH: obj.shortText,
      TXTLG: obj.longText,
    }),

    fromAbapGit: ({ NODENAME, PARENTNAME, TXTSH, TXTLG }) => ({
      name: (NODENAME ?? '').toUpperCase(),
      parentName: PARENTNAME,
      shortText: TXTSH,
      longText: TXTLG,
    }),
  },
);
