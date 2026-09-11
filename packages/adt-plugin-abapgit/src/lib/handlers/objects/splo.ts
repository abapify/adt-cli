/**
 * SPLO (Spool Description) handler for abapGit format
 */

import { splo } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type SpoolDescLike = {
  name: string;
  description?: string;
  language?: string;
  format?: string;
  orientation?: string;
  type?: string;
  columns?: string;
  rows?: string;
  paper?: string;
};

export const spoolDescHandler = createHandler<SpoolDescLike, typeof splo>(
  'SPLO',
  {
    schema: splo,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SPLO',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      TSPLT: {
        SPRAS: isoToSapLang(obj.language),
        PAPART: String(obj.name ?? '').toUpperCase(),
        TXT: obj.description,
      },
      TSPLD: {
        PAPART: String(obj.name ?? '').toUpperCase(),
        PFORMAT: obj.format,
        ORIENT: obj.orientation,
        TYPE: obj.type,
        OUTCOLUMNS: obj.columns,
        OUTROWS: obj.rows,
      },
      TSP0P: {
        PDPAPER: obj.paper,
      },
    }),

    fromAbapGit: ({ TSPLT, TSPLD, TSP0P }) => ({
      name: (TSPLT?.PAPART ?? TSPLD?.PAPART ?? '').toUpperCase(),
      description: TSPLT?.TXT,
      language: sapLangToIso(TSPLT?.SPRAS),
      format: TSPLD?.PFORMAT,
      orientation: TSPLD?.ORIENT,
      type: TSPLD?.TYPE,
      columns: TSPLD?.OUTCOLUMNS,
      rows: TSPLD?.OUTROWS,
      paper: TSP0P?.PDPAPER,
    }),
  },
);
