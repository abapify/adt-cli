/**
 * WDCA (Web Dynpro Application Configuration) handler for abapGit format
 */

import { wdca } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type WdcaLike = {
  name: string;
  configType?: string;
  configVar?: string;
  data?: Array<{ compName?: string; content?: string }>;
  descrLang?: string;
};

export const wdcaHandler = createHandler<WdcaLike, typeof wdca>('WDCA', {
  schema: wdca,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_WDCA',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<WdcaLike>(raw);
    return {
      OUTLINE: {
        CONFIG_ID: String(obj.name ?? '').toUpperCase(),
        CONFIG_TYPE: obj.configType,
        CONFIG_VAR: obj.configVar,
      },
      DATA: obj.data?.length
        ? {
            item: obj.data.map((d) => ({
              CONFIG_ID: String(obj.name ?? '').toUpperCase(),
              CONFIG_TYPE: obj.configType,
              CONFIG_VAR: obj.configVar,
              COMPNAME: d.compName,
              CONTENT: d.content,
            })),
          }
        : undefined,
      DESCR_LANG: isoToSapLang(obj.descrLang),
    };
  },

  fromAbapGit: ({ OUTLINE, DATA, DESCR_LANG }) => {
    const data = normalizeItems(DATA?.item);
    return {
      name: (OUTLINE?.CONFIG_ID ?? '').toUpperCase(),
      configType: OUTLINE?.CONFIG_TYPE,
      configVar: OUTLINE?.CONFIG_VAR,
      data: mapItems(data, (d) => ({
        compName: d.COMPNAME,
        content: d.CONTENT,
      })),
      descrLang: sapLangToIso(DESCR_LANG),
    };
  },
});
