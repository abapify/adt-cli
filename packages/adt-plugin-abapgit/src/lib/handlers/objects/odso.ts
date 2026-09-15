/**
 * ODSO (DataStore Object - BW) handler for abapGit format
 *
 * DataStore Objects are XML-only. The abapGit format stores details
 * (BAPI6116) and info objects (BAPI6116IO) as flat siblings under values.
 */

import { odso } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type DataStoreObjectLike = {
  name: string;
  description?: string;
  shortText?: string;
  odsotype?: string;
  version?: string;
  sizeCategory?: string;
  dataClass?: string;
  noEdSfl?: string;
  keyNotUnique?: string;
  imofl?: string;
  planningMode?: string;
  actViewGen?: string;
  infoObjects?: Array<{
    infoobject?: string;
    version?: string;
    keyflag?: string;
  }>;
  navigation?: unknown;
  indexes?: unknown;
  indexIobj?: unknown;
};

export const dataStoreObjectHandler = createHandler<
  DataStoreObjectLike,
  typeof odso
>('ODSO', {
  schema: odso,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_ODSO',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<DataStoreObjectLike>(raw);
    return {
      ODSO: {
        ODSOBJECT: String(obj.name ?? '').toUpperCase(),
        ODSOTYPE: obj.odsotype,
        OBJVERS: obj.version ?? 'A',
        ODSASIZCAT: obj.sizeCategory,
        ODSADATCLS: obj.dataClass,
        NOEDSFL: obj.noEdSfl,
        KEY_NOT_UNIQUE: obj.keyNotUnique,
        IMOFL: obj.imofl,
        PLANNING_MODE: obj.planningMode,
        ACTVIEWGEN: obj.actViewGen,
        TXTLG: obj.description,
        TXTSH: obj.shortText,
      },
      INFOOBJECTS: obj.infoObjects?.length
        ? {
            BAPI6116IO: obj.infoObjects.map((io) => ({
              INFOBJECT: io.infoobject,
              OBJVERS: io.version,
              KEYFLAG: io.keyflag,
            })),
          }
        : undefined,
      NAVIGATION: obj.navigation,
      INDEXES: obj.indexes,
      INDEX_IOBJ: obj.indexIobj,
    };
  },

  fromAbapGit: ({ ODSO, INFOOBJECTS, NAVIGATION, INDEXES, INDEX_IOBJ }) => {
    const infoObjects = normalizeItems(INFOOBJECTS?.BAPI6116IO);
    return {
      name: (ODSO?.ODSOBJECT ?? '').toUpperCase(),
      description: ODSO?.TXTLG,
      shortText: ODSO?.TXTSH,
      odsotype: ODSO?.ODSOTYPE,
      version: ODSO?.OBJVERS,
      sizeCategory: ODSO?.ODSASIZCAT,
      dataClass: ODSO?.ODSADATCLS,
      noEdSfl: ODSO?.NOEDSFL,
      keyNotUnique: ODSO?.KEY_NOT_UNIQUE,
      imofl: ODSO?.IMOFL,
      planningMode: ODSO?.PLANNING_MODE,
      actViewGen: ODSO?.ACTVIEWGEN,
      infoObjects: mapItems(infoObjects, (io) => ({
        infoobject: io.INFOBJECT,
        version: io.OBJVERS,
        keyflag: io.KEYFLAG,
      })),
      navigation: NAVIGATION,
      indexes: INDEXES,
      indexIobj: INDEX_IOBJ,
    };
  },
});
