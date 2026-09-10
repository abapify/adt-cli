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
  syntax?: Array<{
    nr?: string;
    segtyp?: string;
    parseg?: string;
    parpno?: string;
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
        },
        T_SYNTAX: obj.syntax?.length
          ? {
              EDI_IAPI02: obj.syntax.map((s) => ({
                NR: s.nr,
                SEGTYP: s.segtyp,
                PARSEG: s.parseg,
                PARPNO: s.parpno,
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
        syntax: syntax.map((s) => ({
          nr: s.NR,
          segtyp: s.SEGTYP,
          parseg: s.PARSEG,
          parpno: s.PARPNO,
          mustfl: s.MUSTFL,
        })),
      };
    },
  },
);
