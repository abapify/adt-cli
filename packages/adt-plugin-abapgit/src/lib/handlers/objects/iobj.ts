/**
 * IOBJ (InfoObject - BW) handler for abapGit format
 *
 * InfoObjects are XML-only. The abapGit format stores details (BAPI6108),
 * compounds, and attributes under an IOBJ node.
 */

import { iobj } from '../../../schemas/generated';
import { createHandler } from '../base';

type InfoObjectLike = {
  name: string;
  description?: string;
  type?: string;
  version?: string;
  fieldName?: string;
  compounds?: Array<{ iobjnm?: string; compound?: string }>;
  attributes?: Array<{ atrnm?: string; attrib?: string }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const infoObjectHandler = createHandler<InfoObjectLike, typeof iobj>(
  'IOBJ',
  {
    schema: iobj,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_IOBJ',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      IOBJ: {
        IOBJ: {
          INFOOBJECT: String(obj.name ?? '').toUpperCase(),
          VERSION: obj.version ?? 'A',
          TYPE: obj.type,
          FIELDNM: obj.fieldName,
          TXTLONG: obj.description,
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
                ATTRIB: a.attrib,
              })),
            }
          : undefined,
      },
    }),

    fromAbapGit: ({ IOBJ }) => {
      const compounds = normalizeItems(IOBJ?.COMPOUNDS?.BAPI6108CM);
      const attributes = normalizeItems(IOBJ?.ATTRIBUTES?.BAPI6108AT);
      return {
        name: (IOBJ?.IOBJ?.INFOOBJECT ?? '').toUpperCase(),
        description: IOBJ?.IOBJ?.TXTLONG,
        type: IOBJ?.IOBJ?.TYPE,
        version: IOBJ?.IOBJ?.VERSION,
        fieldName: IOBJ?.IOBJ?.FIELDNM,
        compounds: compounds.map((c) => ({
          iobjnm: c.IOBJNM_Z,
          compound: c.COMPOUND,
        })),
        attributes: attributes.map((a) => ({
          atrnm: a.ATRNM,
          attrib: a.ATTRIB,
        })),
      };
    },
  },
);
