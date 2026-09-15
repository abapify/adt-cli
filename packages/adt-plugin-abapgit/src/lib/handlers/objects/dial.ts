/**
 * DIAL (Dialog Module) handler for abapGit format
 */

import { dial } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type DialogModuleLike = {
  name: string;
  language?: string;
  description?: string;
  dynr?: string;
  program?: string;
  parameters?: Array<{
    dnam?: string;
    dynr?: string;
    param?: string;
    dpnam?: string;
    dtype?: string;
    dplen?: string;
    text?: string;
  }>;
};

export const dialogModuleHandler = createHandler<DialogModuleLike, typeof dial>(
  'DIAL',
  {
    schema: dial,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_DIAL',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<DialogModuleLike>(raw);
      return {
        DIAL: {
          TDCT: {
            DIALOGNAME: String(obj.name ?? '').toUpperCase(),
            DYNR: obj.dynr,
            PROG: obj.program,
            SPRAS: isoToSapLang(obj.language),
            DDTEXT: obj.description,
          },
          DIA_PARS: obj.parameters?.length
            ? {
                item: obj.parameters.map((p) => ({
                  DNAM: p.dnam,
                  DYNR: p.dynr,
                  PARAM: p.param,
                  DPNAM: p.dpnam,
                  DTYPE: p.dtype,
                  DPLEN: p.dplen,
                  P_TEXT: p.text,
                })),
              }
            : undefined,
        },
      };
    },

    fromAbapGit: ({ DIAL }) => {
      const parameters = normalizeItems(DIAL?.DIA_PARS?.item);
      return {
        name: (DIAL?.TDCT?.DIALOGNAME ?? '').toUpperCase(),
        language: sapLangToIso(DIAL?.TDCT?.SPRAS),
        description: DIAL?.TDCT?.DDTEXT,
        dynr: DIAL?.TDCT?.DYNR,
        program: DIAL?.TDCT?.PROG,
        parameters: mapItems(parameters, (p) => ({
          dnam: p.DNAM,
          dynr: p.DYNR,
          param: p.PARAM,
          dpnam: p.DPNAM,
          dtype: p.DTYPE,
          dplen: p.DPLEN,
          text: p.P_TEXT,
        })),
      };
    },
  },
);
