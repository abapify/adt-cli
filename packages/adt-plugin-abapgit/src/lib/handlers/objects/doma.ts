/**
 * Domain (DOMA) object handler for abapGit format
 */

import { AdkDomain } from '../adk';
import { doma } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

export const domainHandler = createHandler(AdkDomain, {
  schema: doma,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DOMA',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const data = obj.dataSync;
    const typeInfo = data?.content?.typeInformation;
    const outInfo = data?.content?.outputInformation;
    return {
      DD01V: {
        DOMNAME: obj.name ?? '',
        DDLANGUAGE: isoToSapLang(data?.language),
        DATATYPE: typeInfo?.datatype ?? '',
        LENG: String(typeInfo?.length ?? ''),
        OUTPUTLEN: String(outInfo?.length ?? ''),
        DECIMALS: String(typeInfo?.decimals ?? ''),
        LOWERCASE: outInfo?.lowercase ? 'X' : '',
        SIGNFLAG: outInfo?.signExists ? 'X' : '',
        CONVEXIT: outInfo?.conversionExit ?? '',
        DDTEXT: obj.description ?? '',
      },
    };
  },

  fromAbapGit: ({ DD01V }) =>
    ({
      name: (DD01V?.DOMNAME ?? '').toUpperCase(),
      type: 'DOMA/DD',
      description: DD01V?.DDTEXT,
      language: sapLangToIso(DD01V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD01V?.DDLANGUAGE),
    }) as { name: string } & Record<string, unknown>,
});
