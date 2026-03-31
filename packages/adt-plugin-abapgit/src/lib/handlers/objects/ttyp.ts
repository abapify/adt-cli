/**
 * Table Type (TTYP) object handler for abapGit format
 *
 * Maps between abapGit DD40V codes and ADT API enum values.
 */

import { AdkTableType } from '../adk';
import { ttyp } from '../../../schemas/generated';
import { createHandler } from '../base';
import {
  isoToSapLang,
  sapLangToIso,
  abapLangVerToAdt,
  abapLangVerFromAdt,
} from '../lang';

// ============================================
// DD40V ↔ ADT API enum mappings
// ============================================

/** DD40V ACCESSMODE → ADT accessType */
const ACCESS_MODE_TO_ADT: Record<string, string> = {
  T: 'standard',
  S: 'sorted',
  H: 'hashed',
};
const ACCESS_MODE_FROM_ADT: Record<string, string> = Object.fromEntries(
  Object.entries(ACCESS_MODE_TO_ADT).map(([k, v]) => [v, k]),
);

/** DD40V KEYDEF → ADT primaryKey.definition */
const KEY_DEF_TO_ADT: Record<string, string> = {
  D: 'standard',
  K: 'keyComponents',
  T: 'rowType',
};
const KEY_DEF_FROM_ADT: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_DEF_TO_ADT).map(([k, v]) => [v, k]),
);

/** DD40V KEYKIND → ADT primaryKey.kind */
const KEY_KIND_TO_ADT: Record<string, string> = {
  N: 'nonUnique',
  U: 'unique',
  G: 'notSpecified',
};
const KEY_KIND_FROM_ADT: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_KIND_TO_ADT).map(([k, v]) => [v, k]),
);

/**
 * DD40V ROWKIND → ADT rowType.typeKind
 *
 * ROWKIND='' (empty) + DATATYPE set → predefinedAbapType (built-in like STRING, INT4)
 * ROWKIND='S' → dictionaryType (references a structure/table/data element)
 * ROWKIND='R' → ref type
 */
const ROW_KIND_TO_ADT: Record<string, string> = {
  '': 'predefinedAbapType',
  S: 'dictionaryType',
  R: 'refToDictionaryType',
};
const ROW_KIND_FROM_ADT: Record<string, string> = Object.fromEntries(
  Object.entries(ROW_KIND_TO_ADT).map(([k, v]) => [v, k]),
);

/**
 * DD40V DATATYPE (DDIC code) → ADT builtInType.dataType (ABAP type name)
 *
 * abapGit stores 4-char DDIC internal codes (e.g. STRG, RSTR).
 * SAP ADT REST API uses ABAP type names (e.g. STRING, XSTRING).
 * Most types use the same name in both (CHAR, NUMC, INT4, etc.);
 * only a few differ.
 */
const DATATYPE_TO_ADT: Record<string, string> = {
  STRG: 'STRING',
  SSTR: 'SSTRING',
  RSTR: 'XSTRING',
  UTCL: 'UTCLONG',
};
const DATATYPE_FROM_ADT: Record<string, string> = Object.fromEntries(
  Object.entries(DATATYPE_TO_ADT).map(([k, v]) => [v, k]),
);

/**
 * DD40V TYPELEN — fixed internal byte length for predefined types.
 *
 * Variable-length types (STRING, XSTRING) have a fixed pointer size (8 bytes)
 * that abapGit stores as TYPELEN. This is not the same as LENG (display length).
 * We only need to emit TYPELEN for types that have noLeng=true (no external LENG).
 */
const FIXED_TYPELEN: Record<string, number> = {
  STRG: 8,
  RSTR: 8,
};

// ============================================
// Handler
// ============================================

export const tableTypeHandler = createHandler(AdkTableType, {
  schema: ttyp,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_TTYP',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const data = obj.dataSync;
    const accessMode =
      ACCESS_MODE_FROM_ADT[data?.accessType ?? ''] ?? data?.accessType ?? '';
    const keyDef =
      KEY_DEF_FROM_ADT[data?.primaryKey?.definition ?? ''] ??
      data?.primaryKey?.definition ??
      '';
    const keyKind =
      KEY_KIND_FROM_ADT[data?.primaryKey?.kind ?? ''] ??
      data?.primaryKey?.kind ??
      '';
    const rowKind =
      ROW_KIND_FROM_ADT[data?.rowType?.typeKind ?? ''] ??
      data?.rowType?.typeKind ??
      '';

    // Map ADT dataType (STRING) → DDIC code (STRG)
    const adtDataType = data?.rowType?.builtInType?.dataType ?? '';
    const ddicDataType = DATATYPE_FROM_ADT[adtDataType] ?? adtDataType;

    // TYPELEN: fixed internal byte length for variable-length types (STRING, XSTRING)
    const typeLen = FIXED_TYPELEN[ddicDataType];

    return {
      DD40V: {
        TYPENAME: obj.name ?? '',
        DDLANGUAGE: isoToSapLang(data?.language || undefined),
        ROWTYPE: data?.rowType?.typeName || undefined,
        ROWKIND: rowKind || undefined,
        DATATYPE: ddicDataType,
        LENG: data?.rowType?.builtInType?.length
          ? String(data.rowType.builtInType.length).padStart(6, '0')
          : undefined,
        DECIMALS: data?.rowType?.builtInType?.decimals
          ? String(data.rowType.builtInType.decimals).padStart(6, '0')
          : undefined,
        ACCESSMODE: accessMode,
        KEYDEF: keyDef,
        KEYKIND: keyKind,
        DDTEXT: obj.description ?? '',
        TYPELEN: typeLen ? String(typeLen).padStart(6, '0') : undefined,
        ABAP_LANGUAGE_VERSION: abapLangVerFromAdt(data?.abapLanguageVersion),
      },
    };
  },

  fromAbapGit: ({ DD40V } = {}) => {
    const accessType =
      ACCESS_MODE_TO_ADT[DD40V?.ACCESSMODE ?? ''] ?? DD40V?.ACCESSMODE;
    const keyDef = KEY_DEF_TO_ADT[DD40V?.KEYDEF ?? ''] ?? DD40V?.KEYDEF;
    const keyKind = KEY_KIND_TO_ADT[DD40V?.KEYKIND ?? ''] ?? DD40V?.KEYKIND;
    const rowKind = ROW_KIND_TO_ADT[DD40V?.ROWKIND ?? ''] ?? DD40V?.ROWKIND;

    // Map DDIC code (STRG) → ADT dataType (STRING)
    const ddicCode = DD40V?.DATATYPE ?? '';
    const adtDataType = DATATYPE_TO_ADT[ddicCode] ?? ddicCode;

    // For predefinedAbapType (built-in), typeName should be empty
    // For dictionaryType, typeName is the referenced type name
    const isPredefined = rowKind === 'predefinedAbapType';

    return {
      name: (DD40V?.TYPENAME ?? '').toUpperCase(),
      type: 'TTYP/DA',
      description: DD40V?.DDTEXT,
      language: sapLangToIso(DD40V?.DDLANGUAGE),
      masterLanguage: sapLangToIso(DD40V?.DDLANGUAGE),
      abapLanguageVersion: abapLangVerToAdt(DD40V?.ABAP_LANGUAGE_VERSION),
      rowType: {
        typeKind: rowKind,
        typeName: isPredefined ? '' : DD40V?.ROWTYPE || '',
        // SAP's strict xs:sequence parser requires ALL elements in builtInType
        // to be present. Default length/decimals to 0 instead of omitting.
        builtInType: ddicCode
          ? {
              dataType: adtDataType,
              length: DD40V?.LENG ? Number(DD40V.LENG) : 0,
              decimals: DD40V?.DECIMALS ? Number(DD40V.DECIMALS) : 0,
            }
          : undefined,
        rangeType: '',
      },
      accessType,
      primaryKey: {
        definition: keyDef,
        kind: keyKind,
        components: { component: [] },
        alias: '',
      },
      secondaryKeys: {
        allowed: 'notSpecified',
      },
    } as { name: string } & Record<string, unknown>;
  },
});
