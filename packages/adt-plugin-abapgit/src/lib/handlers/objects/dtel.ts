/**
 * Data Element (DTEL) object handler for abapGit format
 */

import { AdkDataElement } from '../adk';
import { dtel } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

export const dataElementHandler = createHandler(AdkDataElement, {
  schema: dtel,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DTEL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const data = obj.dataSync;
    return {
      DD04V: {
        ROLLNAME: obj.name ?? '',
        DDLANGUAGE: isoToSapLang(obj.language || undefined),
        DDTEXT: obj.description ?? '',
        DOMNAME: data?.typeName ?? '',
        DATATYPE: data?.dataType ?? '',
        LENG: String(data?.dataTypeLength ?? ''),
        DECIMALS: String(data?.dataTypeDecimals ?? ''),
        REPTEXT: data?.headingFieldLabel ?? '',
        SCRTEXT_S: data?.shortFieldLabel ?? '',
        SCRTEXT_M: data?.mediumFieldLabel ?? '',
        SCRTEXT_L: data?.longFieldLabel ?? '',
        HEADLEN: String(data?.headingFieldLength ?? ''),
        SCRLEN1: String(data?.shortFieldLength ?? ''),
        SCRLEN2: String(data?.mediumFieldLength ?? ''),
        SCRLEN3: String(data?.longFieldLength ?? ''),
        REFKIND: data?.typeKind === 'domain' ? 'D' : '',
      },
    };
  },

  fromAbapGit: ({ DD04V }) =>
    ({
      name: (DD04V?.ROLLNAME ?? '').toUpperCase(),
      type: 'DTEL/DE',
      description: DD04V?.DDTEXT,
      language: sapLangToIso(DD04V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD04V?.DDLANGUAGE),
      abapLanguageVersion: DD04V?.ABAP_LANGUAGE_VERSION,
    }) as { name: string } & Record<string, unknown>,
});
