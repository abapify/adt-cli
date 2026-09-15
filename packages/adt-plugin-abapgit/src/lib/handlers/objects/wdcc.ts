/**
 * WDCC (Web Dynpro Component Configuration) handler for abapGit format
 */

import { wdcc } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type WdccLike = {
  name: string;
  configId?: string;
  configType?: string;
  configVar?: string;
  wdaComponent?: string;
  parent?: string;
  relId?: string;
  otrTexts?: Array<{ name?: string; text?: string }>;
  descrLang?: string;
};

export const wdccHandler = createHandler<WdccLike, typeof wdcc>('WDCC', {
  schema: wdcc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_WDCC',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<WdccLike>(raw);
    return {
      OBJECT_NAME: String(obj.name ?? '').toUpperCase(),
      CONFIG_ID: obj.configId,
      CONFIG_TYPE: obj.configType,
      CONFIG_VAR: obj.configVar,
      WDA_COMPONENT: obj.wdaComponent,
      PARENT: obj.parent,
      RELID: obj.relId,
      OTR_TEXT: obj.otrTexts?.length
        ? { item: obj.otrTexts.map((t) => ({ NAME: t.name, TEXT: t.text })) }
        : undefined,
      DESCR_LANG: isoToSapLang(obj.descrLang),
    };
  },

  fromAbapGit: (values) => {
    const otrTexts = normalizeItems(values.OTR_TEXT?.item);
    return {
      name: (values.OBJECT_NAME ?? '').toUpperCase(),
      configId: values.CONFIG_ID,
      configType: values.CONFIG_TYPE,
      configVar: values.CONFIG_VAR,
      wdaComponent: values.WDA_COMPONENT,
      parent: values.PARENT,
      relId: values.RELID,
      otrTexts: mapItems(otrTexts, (t) => ({ name: t.NAME, text: t.TEXT })),
      descrLang: sapLangToIso(values.DESCR_LANG),
    };
  },
});
