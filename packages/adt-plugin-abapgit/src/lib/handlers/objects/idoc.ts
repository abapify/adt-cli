/**
 * IDOC (IDoc type) handler for abapGit format
 *
 * IDoc types are XML-only. The abapGit format stores attributes
 * (EDI_IAPI01) and syntax table (EDI_IAPI02) under an IDOC node.
 */

import { idoc } from '../../../schemas/generated';
import { createHandler } from '../base';

type IdocTypeLike = {
  name: string;
  description?: string;
  released?: string;
  closed?: string;
  applrel?: string;
  firsttyp?: string;
  pretyp?: string;
  succtyp?: string;
  lasttyp?: string;
  generated?: string;
  syntax?: Array<{
    nr?: string;
    segtyp?: string;
    parseg?: string;
    parpno?: string;
    parflg?: string;
    mustfl?: string;
  }>;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const idocTypeHandler = createHandler<IdocTypeLike, typeof idoc>(
  'IDOC',
  {
    schema: idoc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_IDOC',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      IDOC: {
        ATTRIBUTES: {
          IDOCTYP: String(obj.name ?? '').toUpperCase(),
          DESCRP: obj.description,
          CLOSED: obj.closed,
          RELEASED: obj.released,
          APPLREL: obj.applrel,
          FIRSTTYP: obj.firsttyp,
          PRETYP: obj.pretyp,
          SUCCTYP: obj.succtyp,
          LASTTYP: obj.lasttyp,
          GENERATED: obj.generated,
        },
        T_SYNTAX: obj.syntax?.length
          ? {
              EDI_IAPI02: obj.syntax.map((s) => ({
                NR: s.nr,
                SEGTYP: s.segtyp,
                PARSEG: s.parseg,
                PARPNO: s.parpno,
                PARFLG: s.parflg,
                MUSTFL: s.mustfl,
              })),
            }
          : undefined,
      },
    }),

    fromAbapGit: ({ IDOC }) => {
      const syntax = normalizeItems(IDOC?.T_SYNTAX?.EDI_IAPI02);
      return {
        name: (IDOC?.ATTRIBUTES?.IDOCTYP ?? '').toUpperCase(),
        description: IDOC?.ATTRIBUTES?.DESCRP,
        released: IDOC?.ATTRIBUTES?.RELEASED,
        closed: IDOC?.ATTRIBUTES?.CLOSED,
        applrel: IDOC?.ATTRIBUTES?.APPLREL,
        firsttyp: IDOC?.ATTRIBUTES?.FIRSTTYP,
        pretyp: IDOC?.ATTRIBUTES?.PRETYP,
        succtyp: IDOC?.ATTRIBUTES?.SUCCTYP,
        lasttyp: IDOC?.ATTRIBUTES?.LASTTYP,
        generated: IDOC?.ATTRIBUTES?.GENERATED,
        syntax: syntax.map((s) => ({
          nr: s.NR,
          segtyp: s.SEGTYP,
          parseg: s.PARSEG,
          parpno: s.PARPNO,
          parflg: s.PARFLG,
          mustfl: s.MUSTFL,
        })),
      };
    },
  },
);
