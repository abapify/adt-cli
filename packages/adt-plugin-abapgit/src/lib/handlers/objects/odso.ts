/**
 * ODSO (DataStore Object - BW) handler for abapGit format
 *
 * DataStore Objects are XML-only. The abapGit format stores details
 * (BAPI6116) and info objects (BAPI6116IO) under an ODSO node.
 */

import { odso } from '../../../schemas/generated';
import { createHandler } from '../base';

type DataStoreObjectLike = {
  name: string;
  description?: string;
  odsotype?: string;
  version?: string;
  infoObjects?: Array<{ infoobject?: string; keyflag?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const dataStoreObjectHandler = createHandler<
  DataStoreObjectLike,
  typeof odso
>('ODSO', {
  schema: odso,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_ODSO',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    ODSO: {
      ODSO: {
        ODSOBJECT: String(obj.name ?? '').toUpperCase(),
        ODSOTYPE: obj.odsotype,
        OBJVERS: obj.version ?? 'A',
        TXTLG: obj.description,
      },
      INFOOBJECTS: obj.infoObjects?.length
        ? {
            BAPI6116IO: obj.infoObjects.map((io) => ({
              INFOBJECT: io.infoobject,
              KEYFLAG: io.keyflag,
            })),
          }
        : undefined,
    },
  }),

  fromAbapGit: ({ ODSO }) => {
    const infoObjects = normalizeItems(ODSO?.INFOOBJECTS?.BAPI6116IO);
    return {
      name: (ODSO?.ODSO?.ODSOBJECT ?? '').toUpperCase(),
      description: ODSO?.ODSO?.TXTLG,
      odsotype: ODSO?.ODSO?.ODSOTYPE,
      version: ODSO?.ODSO?.OBJVERS,
      infoObjects: infoObjects.map((io) => ({
        infoobject: io.INFOBJECT,
        keyflag: io.KEYFLAG,
      })),
    };
  },
});
