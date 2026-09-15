/**
 * IOBJ (InfoObject - BW) handler for abapGit format
 *
 * InfoObjects are XML-only. The abapGit format stores details (BAPI6108),
 * compounds, and attributes as flat siblings under values.
 */

import { iobj } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type InfoObjectLike = {
  name: string;
  description?: string;
  shortText?: string;
  type?: string;
  version?: string;
  objStat?: string;
  activFl?: string;
  fieldName?: string;
  contRel?: string;
  dataTp?: string;
  intLen?: string;
  outputLen?: string;
  lowCase?: string;
  convExit?: string;
  keyFigName?: string;
  compounds?: Array<{ iobjnm?: string; compound?: string }>;
  attributes?: Array<{
    atrnm?: string;
    objstat?: string;
    attrib?: string;
    kyfnm?: string;
  }>;
};

export const infoObjectHandler = createHandler<InfoObjectLike, typeof iobj>(
  'IOBJ',
  {
    schema: iobj,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_IOBJ',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<InfoObjectLike>(raw);
      return {
        IOBJ: {
          INFOOBJECT: String(obj.name ?? '').toUpperCase(),
          VERSION: obj.version ?? 'A',
          TYPE: obj.type,
          OBJSTAT: obj.objStat,
          ACTIVFL: obj.activFl,
          FIELDNM: obj.fieldName,
          CONTREL: obj.contRel,
          DATATP: obj.dataTp,
          INTLEN: obj.intLen,
          OUTPUTLEN: obj.outputLen,
          LOWCASE: obj.lowCase,
          CONVEXIT: obj.convExit,
          KYFNM: obj.keyFigName,
          TXTLONG: obj.description,
          TXTSHRT: obj.shortText,
        },
        COMPOUNDS: obj.compounds?.length
          ? {
              BAPI6108CM: obj.compounds.map((c) => ({
                IOBJNM_Z: c.iobjnm,
                COMPOUND: c.compound,
              })),
            }
          : undefined,
        ATTRIBUTES: obj.attributes?.length
          ? {
              BAPI6108AT: obj.attributes.map((a) => ({
                ATRNM: a.atrnm,
                OBJSTAT: a.objstat,
                ATTRIB: a.attrib,
                KYFNM: a.kyfnm,
              })),
            }
          : undefined,
      };
    },

    fromAbapGit: ({ IOBJ, COMPOUNDS, ATTRIBUTES }) => {
      const compounds = normalizeItems(COMPOUNDS?.BAPI6108CM);
      const attributes = normalizeItems(ATTRIBUTES?.BAPI6108AT);
      return {
        name: (IOBJ?.INFOOBJECT ?? '').toUpperCase(),
        description: IOBJ?.TXTLONG,
        shortText: IOBJ?.TXTSHRT,
        type: IOBJ?.TYPE,
        version: IOBJ?.VERSION,
        objStat: IOBJ?.OBJSTAT,
        activFl: IOBJ?.ACTIVFL,
        fieldName: IOBJ?.FIELDNM,
        contRel: IOBJ?.CONTREL,
        dataTp: IOBJ?.DATATP,
        intLen: IOBJ?.INTLEN,
        outputLen: IOBJ?.OUTPUTLEN,
        lowCase: IOBJ?.LOWCASE,
        convExit: IOBJ?.CONVEXIT,
        keyFigName: IOBJ?.KYFNM,
        compounds: mapItems(compounds, (c) => ({
          iobjnm: c.IOBJNM_Z,
          compound: c.COMPOUND,
        })),
        attributes: mapItems(attributes, (a) => ({
          atrnm: a.ATRNM,
          objstat: a.OBJSTAT,
          attrib: a.ATTRIB,
          kyfnm: a.KYFNM,
        })),
      };
    },
  },
);
