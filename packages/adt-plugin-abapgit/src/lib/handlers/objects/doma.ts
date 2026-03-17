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
    const valueInfo = data?.content?.valueInformation;

    // Serialize fixed values if present
    const fixValues = valueInfo?.fixValues?.fixValue;
    const DD07V_TAB =
      fixValues && fixValues.length > 0
        ? {
            DD07V: fixValues.map((fv) => {
              const entry: Record<string, string> = {
                DOMNAME: obj.name ?? '',
                VALPOS: String(fv.position ?? '').padStart(4, '0'),
                DDLANGUAGE: isoToSapLang(data?.language),
                DOMVALUE_L: fv.low ?? '',
                DDTEXT: fv.text ?? '',
              };
              // Only include DOMVALUE_H if it has a value (for ranges)
              if (fv.high) {
                entry.DOMVALUE_H = fv.high;
              }
              return entry;
            }),
          }
        : undefined;

    return {
      DD01V: {
        DOMNAME: obj.name ?? '',
        DDLANGUAGE: isoToSapLang(data?.language),
        DATATYPE: typeInfo?.datatype ?? '',
        LENG: String(typeInfo?.length ?? '').padStart(6, '0'),
        DECIMALS: typeInfo?.decimals
          ? String(typeInfo.decimals).padStart(6, '0')
          : undefined,
        OUTPUTLEN: String(outInfo?.length ?? '').padStart(6, '0'),
        LOWERCASE: outInfo?.lowercase ? 'X' : undefined,
        SIGNFLAG: outInfo?.signExists ? 'X' : undefined,
        CONVEXIT: outInfo?.conversionExit || undefined,
        ENTITYTAB: valueInfo?.valueTableRef?.name || undefined,
        VALEXI: fixValues && fixValues.length > 0 ? 'X' : undefined,
        DDTEXT: obj.description ?? '',
        DOMMASTER: isoToSapLang(obj.masterLanguage),
      },
      DD07V_TAB,
    };
  },

  fromAbapGit: ({ DD01V, DD07V_TAB } = {}) => {
    const fixValues =
      DD07V_TAB?.DD07V?.map((fv, idx) => ({
        position: Number(fv.VALPOS ?? idx + 1),
        low: fv.DOMVALUE_L ?? '',
        high: fv.DOMVALUE_H ?? '',
        text: fv.DDTEXT ?? '',
      })) ?? [];

    return {
      name: (DD01V?.DOMNAME ?? '').toUpperCase(),
      type: 'DOMA/DD',
      description: DD01V?.DDTEXT,
      language: sapLangToIso(DD01V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD01V?.DDLANGUAGE),
      content: {
        typeInformation: {
          datatype: DD01V?.DATATYPE ?? '',
          length: Number(DD01V?.LENG ?? 0),
          decimals: Number(DD01V?.DECIMALS ?? 0),
        },
        outputInformation: {
          length: Number(DD01V?.OUTPUTLEN ?? 0),
          style: '',
          conversionExit: DD01V?.CONVEXIT || undefined,
          signExists: DD01V?.SIGNFLAG === 'X',
          lowercase: DD01V?.LOWERCASE === 'X',
        },
        valueInformation: {
          valueTableRef: {
            name: DD01V?.ENTITYTAB || undefined,
          },
          fixValues: {
            fixValue: fixValues.length > 0 ? fixValues : undefined,
          },
        },
      },
    } as { name: string } & Record<string, unknown>;
  },
});
