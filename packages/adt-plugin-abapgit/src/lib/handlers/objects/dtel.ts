/**
 * Data Element (DTEL) object handler for abapGit format
 */

import { AdkDataElement } from '../adk';
import { dtel } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso, abapLangVerToAdt } from '../lang';

/**
 * Map ADT typeKind → abapGit REFKIND
 */
const TYPEKIND_TO_REFKIND: Record<string, string> = {
  domain: 'D',
  predefinedAbapType: '',
  refToPredefinedAbapType: 'R',
  refToDictionaryType: 'R',
  refToClifType: 'R',
};

/**
 * Map ADT typeKind → abapGit REFTYPE (only for reference types)
 */
const TYPEKIND_TO_REFTYPE: Record<string, string | undefined> = {
  refToClifType: 'C',
  refToDictionaryType: 'E',
  refToPredefinedAbapType: 'E',
};

/**
 * Derive OUTPUTLEN from ABAP data type + length + decimals.
 *
 * The ADT REST API for data elements does not return OUTPUTLEN — SAP derives
 * it internally from the type definition. This function replicates SAP's
 * output length calculation for standard ABAP dictionary types.
 */
function deriveOutputLength(
  dataType: string | undefined,
  length: number | undefined,
  decimals: number | undefined,
): string | undefined {
  if (!dataType || !length) return undefined;

  const type = dataType.toUpperCase();
  const len = length;
  const dec = decimals ?? 0;

  switch (type) {
    // Simple types: output length = internal length
    case 'CHAR':
    case 'NUMC':
    case 'UNIT':
    case 'CUKY':
    case 'LCHR':
    case 'SSTRING':
      return String(len).padStart(6, '0');

    // Fixed-length types with known output length
    case 'CLNT':
      return '000003';
    case 'LANG':
      return '000001';
    case 'DATS':
      return '000010';
    case 'TIMS':
      return '000008';

    // Integer types
    case 'INT1':
      return '000003';
    case 'INT2':
      return '000005';
    case 'INT4':
      return '000010';
    case 'INT8':
      return '000019';

    // Floating point
    case 'FLTP':
      return '000022';

    // Numeric types with formatting: len + sign + group separators
    case 'DEC':
    case 'CURR':
    case 'QUAN': {
      const intDigits = len - dec;
      const separators = intDigits > 1 ? Math.floor((intDigits - 1) / 3) : 0;
      const outputLen = len + 1 + separators;
      return String(outputLen).padStart(6, '0');
    }

    // Raw/hex types: 2 hex chars per byte
    case 'RAW':
    case 'LRAW':
      return String(len * 2).padStart(6, '0');

    // Variable-length types have no meaningful output length
    case 'STRING':
    case 'RAWSTRING':
    case 'GEOM_EWKB':
      return undefined;

    default:
      return undefined;
  }
}

export const dataElementHandler = createHandler(AdkDataElement, {
  schema: dtel,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DTEL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const data = obj.dataSync;
    const de = data?.dataElement;
    const typeKind = de?.typeKind ?? '';

    // Domain-based DTELs: DATATYPE/LENG/DECIMALS/OUTPUTLEN are inherited
    // from the domain, not stored on the DTEL itself. abapGit omits them.
    const isDomain = typeKind === 'domain';

    // Reference types: abapGit emits DATATYPE=REF but ADT doesn't return it.
    const isRef = typeKind.startsWith('refTo');
    const dataType = isRef ? 'REF' : de?.dataType || undefined;

    // Suppress domain-inherited type info
    const effectiveDataType = isDomain ? undefined : dataType;
    const effectiveLeng =
      isDomain || !de?.dataTypeLength
        ? undefined
        : String(de.dataTypeLength).padStart(6, '0');
    const effectiveDecimals =
      isDomain || !de?.dataTypeDecimals
        ? undefined
        : String(de.dataTypeDecimals).padStart(6, '0');
    const effectiveOutputLen = isDomain
      ? undefined
      : deriveOutputLength(
          de?.dataType,
          de?.dataTypeLength,
          de?.dataTypeDecimals,
        );

    // Properties ordered to match canonical DD04V table column order.
    // The XSD xs:sequence enforces this order in the XML output.
    return {
      DD04V: {
        ROLLNAME: obj.name ?? '',
        DDLANGUAGE: isoToSapLang(obj.language || undefined),
        DOMNAME: de?.typeName || undefined,
        HEADLEN: de?.headingFieldLength
          ? String(de.headingFieldLength)
          : undefined,
        SCRLEN1: de?.shortFieldLength ? String(de.shortFieldLength) : undefined,
        SCRLEN2: de?.mediumFieldLength
          ? String(de.mediumFieldLength)
          : undefined,
        SCRLEN3: de?.longFieldLength ? String(de.longFieldLength) : undefined,
        DDTEXT: obj.description ?? '',
        REPTEXT: de?.headingFieldLabel || undefined,
        SCRTEXT_S: de?.shortFieldLabel || undefined,
        SCRTEXT_M: de?.mediumFieldLabel || undefined,
        SCRTEXT_L: de?.longFieldLabel || undefined,
        DTELMASTER: isoToSapLang(obj.masterLanguage || undefined),
        DATATYPE: effectiveDataType,
        LENG: effectiveLeng,
        DECIMALS: effectiveDecimals,
        OUTPUTLEN: effectiveOutputLen,
        REFKIND: TYPEKIND_TO_REFKIND[typeKind] || undefined,
        REFTYPE: TYPEKIND_TO_REFTYPE[typeKind],
      },
    };
  },

  fromAbapGit: ({ DD04V } = {}) => {
    // Map REFKIND + REFTYPE to ADT typeKind enum
    const refKind = DD04V?.REFKIND ?? '';
    const refType = DD04V?.REFTYPE ?? '';
    let typeKind: string;
    if (refKind === 'D') {
      typeKind = 'domain';
    } else if (refKind === 'R') {
      typeKind = refType === 'C' ? 'refToClifType' : 'refToDictionaryType';
    } else {
      typeKind = DD04V?.DATATYPE ? 'predefinedAbapType' : 'domain';
    }

    return {
      name: (DD04V?.ROLLNAME ?? '').toUpperCase(),
      type: 'DTEL/DE',
      description: DD04V?.DDTEXT,
      language: sapLangToIso(DD04V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD04V?.DDLANGUAGE),
      abapLanguageVersion: abapLangVerToAdt(DD04V?.ABAP_LANGUAGE_VERSION),
      dataElement: {
        // SAP's strict xs:sequence parser requires ALL elements to be present.
        // Every field in the dataelements.xsd sequence must have an explicit value.
        typeKind,
        typeName: DD04V?.DOMNAME || '',
        dataType: DD04V?.DATATYPE || '',
        dataTypeLength: DD04V?.LENG ? Number(DD04V.LENG) : 0,
        dataTypeLengthEnabled: false,
        dataTypeDecimals: DD04V?.DECIMALS ? Number(DD04V.DECIMALS) : 0,
        dataTypeDecimalsEnabled: false,
        shortFieldLabel: DD04V?.SCRTEXT_S || '',
        shortFieldLength: DD04V?.SCRLEN1 ? Number(DD04V.SCRLEN1) : 0,
        shortFieldMaxLength: DD04V?.SCRLEN1 ? Number(DD04V.SCRLEN1) : 0,
        mediumFieldLabel: DD04V?.SCRTEXT_M || '',
        mediumFieldLength: DD04V?.SCRLEN2 ? Number(DD04V.SCRLEN2) : 0,
        mediumFieldMaxLength: DD04V?.SCRLEN2 ? Number(DD04V.SCRLEN2) : 0,
        longFieldLabel: DD04V?.SCRTEXT_L || '',
        longFieldLength: DD04V?.SCRLEN3 ? Number(DD04V.SCRLEN3) : 0,
        longFieldMaxLength: DD04V?.SCRLEN3 ? Number(DD04V.SCRLEN3) : 0,
        headingFieldLabel: DD04V?.REPTEXT || '',
        headingFieldLength: DD04V?.HEADLEN ? Number(DD04V.HEADLEN) : 0,
        headingFieldMaxLength: DD04V?.HEADLEN ? Number(DD04V.HEADLEN) : 0,
        searchHelp: '',
        searchHelpParameter: '',
        setGetParameter: '',
        defaultComponentName: '',
        deactivateInputHistory: false,
        changeDocument: false,
        leftToRightDirection: false,
        deactivateBIDIFiltering: false,
        documentationStatus: '',
      },
    } as { name: string } & Record<string, unknown>;
  },
});
