/**
 * abapGit DD02V/DD03P → CDS DDL Source Builder
 *
 * Reverse mapping of cds-to-abapgit.ts — reconstructs CDS DDL source code
 * from parsed abapGit XML data (DD02V header + DD03P field entries).
 *
 * Used by `adt diff` to compare local abapGit serialized files against
 * SAP remote CDS source fetched via ADT /source/main endpoint.
 */

// ============================================
// DD02V / DD03P input types
// (mirror of cds-to-abapgit.ts output types)
// ============================================

export interface DD02VData {
  TABNAME?: string;
  DDLANGUAGE?: string;
  TABCLASS?: string;
  LANGDEP?: string;
  DDTEXT?: string;
  MASTERLANG?: string;
  CONTFLAG?: string;
  EXCLASS?: string;
  AUTHCLASS?: string;
  CLIDEP?: string;
  BUFFERED?: string;
  MATEFLAG?: string;
  SHLPEXI?: string;
}

export interface DD03PData {
  FIELDNAME?: string;
  POSITION?: string;
  KEYFLAG?: string;
  ROLLNAME?: string;
  ADMINFIELD?: string;
  INTTYPE?: string;
  INTLEN?: string;
  NOTNULL?: string;
  DATATYPE?: string;
  LENG?: string;
  DECIMALS?: string;
  SHLPORIGIN?: string;
  MASK?: string;
  COMPTYPE?: string;
  REFTABLE?: string;
  REFFIELD?: string;
  PRECFIELD?: string;
  DDTEXT?: string;
  DOMNAME?: string;
}

// ============================================
// Reverse mapping tables
// ============================================

/** DDIC DATATYPE → CDS abap.<type> name */
const DATATYPE_TO_CDS: Record<string, string> = {
  CHAR: 'char',
  CLNT: 'clnt',
  NUMC: 'numc',
  DATS: 'dats',
  DATN: 'datn',
  TIMS: 'tims',
  TIMN: 'timn',
  DEC: 'dec',
  CURR: 'curr',
  QUAN: 'quan',
  RAW: 'raw',
  INT1: 'int1',
  INT2: 'int2',
  INT4: 'int4',
  INT8: 'int8',
  FLTP: 'fltp',
  STRG: 'string',
  RSTR: 'rawstring',
  CUKY: 'cuky',
  UNIT: 'unit',
  LANG: 'lang',
  ACCP: 'accp',
  PREC: 'prec',
  D16N: 'd16n',
  D34N: 'd34n',
  D16R: 'd16r',
  D34R: 'd34r',
  D16D: 'd16d',
  D34D: 'd34d',
  UTCL: 'utclong',
  SSTR: 'sstring',
  LCHR: 'lchr',
  LRAW: 'lraw',
};

/** Types that never take a length parameter in CDS */
const NO_LENGTH_TYPES = new Set([
  'clnt',
  'cuky',
  'dats',
  'datn',
  'tims',
  'timn',
  'int1',
  'int2',
  'int4',
  'int8',
  'fltp',
  'lang',
  'accp',
  'prec',
  'd16n',
  'd34n',
  'd16r',
  'd34r',
  'utclong',
]);

/** Types that take decimals in CDS: abap.dec(len,dec) */
const DECIMAL_TYPES = new Set(['dec', 'curr', 'quan', 'fltp', 'd16d', 'd34d']);

/** Types that are variable-length (string, rawstring) — length 0 is omitted */
const VARIABLE_LENGTH_TYPES = new Set(['string', 'rawstring']);

/** DD02V EXCLASS → CDS @AbapCatalog.enhancement.category */
const ENHANCEMENT_CATEGORY_REVERSE: Record<string, string> = {
  '0': '#NOT_CLASSIFIED',
  '1': '#NOT_EXTENSIBLE',
  '2': '#EXTENSIBLE_CHARACTER_NUMERIC',
  '3': '#EXTENSIBLE_CHARACTER',
  '4': '#EXTENSIBLE_ANY',
};

/** DD02V CONTFLAG → CDS @AbapCatalog.deliveryClass */
const DELIVERY_CLASS_REVERSE: Record<string, string> = {
  A: '#A',
  C: '#C',
  L: '#L',
  G: '#G',
  E: '#E',
  S: '#S',
  W: '#W',
};

/** DD02V TABCLASS → CDS @AbapCatalog.tableCategory */
const TABLE_CATEGORY_REVERSE: Record<string, string> = {
  TRANSP: '#TRANSPARENT',
  CLUSTER: '#CLUSTER',
  POOL: '#POOL',
  APPEND: '#APPEND',
};

/** DD02V MATEFLAG → CDS @AbapCatalog.dataMaintenance */
const DATA_MAINTENANCE_REVERSE: Record<string, string> = {
  X: '#RESTRICTED',
  N: '#NOT_ALLOWED',
  '': '#ALLOWED',
};

// ============================================
// Builder
// ============================================

/**
 * Push a reverse-mapped header annotation when the DDIC code has a CDS
 * meaning. `code` is the raw DDIC value (`''` is meaningful for some flags).
 */
function pushMappedAnnotation(
  lines: string[],
  label: string,
  code: string | undefined,
  mapping: Record<string, string>,
): void {
  const value = mapping[code ?? ''];
  if (value) {
    lines.push(`@${label} : ${value}`);
  }
}

/** Push the DD02V-derived header annotations. */
function pushHeaderAnnotations(
  lines: string[],
  dd02v: DD02VData,
  isStructure: boolean,
): void {
  if (dd02v.DDTEXT) {
    lines.push(
      `@EndUserText.label : '${escapeAnnotationString(dd02v.DDTEXT)}'`,
    );
  }

  pushMappedAnnotation(
    lines,
    'AbapCatalog.enhancement.category',
    dd02v.EXCLASS,
    ENHANCEMENT_CATEGORY_REVERSE,
  );

  if (!isStructure) {
    // Table-specific annotations
    pushMappedAnnotation(
      lines,
      'AbapCatalog.tableCategory',
      dd02v.TABCLASS,
      TABLE_CATEGORY_REVERSE,
    );
    pushMappedAnnotation(
      lines,
      'AbapCatalog.deliveryClass',
      dd02v.CONTFLAG,
      DELIVERY_CLASS_REVERSE,
    );
    if (dd02v.MATEFLAG !== undefined) {
      pushMappedAnnotation(
        lines,
        'AbapCatalog.dataMaintenance',
        dd02v.MATEFLAG,
        DATA_MAINTENANCE_REVERSE,
      );
    }
  }
}

/** Emit include/field lines, field names aligned to `maxNameWidth`. */
function pushMemberLines(
  lines: string[],
  fieldInfos: MemberInfo[],
  maxNameWidth: number,
): void {
  for (const info of fieldInfos) {
    if (info.kind === 'include') {
      if (info.suffix) {
        lines.push(`  include ${info.name} with suffix ${info.suffix};`);
      } else {
        lines.push(`  include ${info.name};`);
      }
    } else {
      // Field annotations (e.g., @Semantics.amount.currencyCode)
      for (const ann of info.annotations) {
        lines.push(`  ${ann}`);
      }

      const paddedPrefix = info.prefix.padEnd(maxNameWidth);
      lines.push(`  ${paddedPrefix} : ${info.typeStr};`);
    }
  }
}

/**
 * Build CDS DDL source from DD02V header and DD03P field entries.
 *
 * @param dd02v - Table/structure header data
 * @param dd03pEntries - Field entries (sorted by POSITION if present)
 * @returns CDS DDL source string
 */
export function buildCdsDdl(
  dd02v: DD02VData,
  dd03pEntries: DD03PData[],
): string {
  const lines: string[] = [];
  const tableName = dd02v.TABNAME ?? '';
  const isStructure = dd02v.TABCLASS === 'INTTAB';

  // --- Annotations ---
  pushHeaderAnnotations(lines, dd02v, isStructure);

  // --- Definition header ---
  const keyword = isStructure ? 'define structure' : 'define table';
  lines.push(`${keyword} ${tableName.toLowerCase()} {`, ''); // Blank line after opening brace (SAP format)

  // --- Sort fields by POSITION ---
  const sorted = [...dd03pEntries].sort((a, b) => {
    const posA = Number.parseInt(a.POSITION ?? '0', 10);
    const posB = Number.parseInt(b.POSITION ?? '0', 10);
    return posA - posB;
  });

  // --- Compute alignment ---
  // Find max field name width for alignment (only field entries, not includes)
  const fieldInfos = buildFieldInfos(sorted, tableName);
  const maxNameWidth = Math.max(
    ...fieldInfos
      .filter((f): f is FieldInfo => f.kind === 'field')
      .map((f) => f.prefix.length),
    0,
  );

  // --- Emit fields ---
  pushMemberLines(lines, fieldInfos, maxNameWidth);

  lines.push('', '}'); // Blank line before closing brace (SAP format)

  return lines.join('\n') + '\n'; // Trailing newline (SAP format)
}

// ============================================
// Internal helpers
// ============================================

interface FieldInfo {
  kind: 'field';
  /** "key fieldname" or "fieldname" — used for alignment */
  prefix: string;
  /** CDS type string (e.g., "abap.char(10) not null") */
  typeStr: string;
  /** Field-level annotations */
  annotations: string[];
}

interface IncludeInfo {
  kind: 'include';
  name: string;
  /** Optional suffix for `include ... with suffix <suffix>` */
  suffix?: string;
}

type MemberInfo = FieldInfo | IncludeInfo;

/**
 * Assemble a field info from an already-rendered base type string, adding
 * the `key` prefix and `not null` suffix.
 */
function buildTypedFieldInfo(
  fieldName: string,
  typeBase: string,
  entry: DD03PData,
  annotations: string[] = [],
): FieldInfo {
  const isKey = entry.KEYFLAG === 'X';
  const notNull = entry.NOTNULL === 'X' || isKey;
  return {
    kind: 'field',
    prefix: isKey ? `key ${fieldName.toLowerCase()}` : fieldName.toLowerCase(),
    typeStr: notNull ? `${typeBase} not null` : typeBase,
    annotations,
  };
}

/** `@Semantics` annotations for CURR/QUAN fields with a reference table. */
function semanticsAnnotations(entry: DD03PData, tableName: string): string[] {
  const annotations: string[] = [];

  // @Semantics annotations for CURR/QUAN fields
  if (entry.DATATYPE === 'CURR' && entry.REFTABLE && entry.REFFIELD) {
    const refTable =
      entry.REFTABLE.toUpperCase() === tableName.toUpperCase()
        ? tableName.toLowerCase()
        : entry.REFTABLE.toLowerCase();
    annotations.push(
      `@Semantics.amount.currencyCode : '${refTable}.${entry.REFFIELD.toLowerCase()}'`,
    );
  } else if (entry.DATATYPE === 'QUAN' && entry.REFTABLE && entry.REFFIELD) {
    const refTable =
      entry.REFTABLE.toUpperCase() === tableName.toUpperCase()
        ? tableName.toLowerCase()
        : entry.REFTABLE.toLowerCase();
    annotations.push(
      `@Semantics.quantity.unitOfMeasure : '${refTable}.${entry.REFFIELD.toLowerCase()}'`,
    );
  }

  return annotations;
}

/** Classify one DD03P entry into a field/include info (or nothing). */
function buildMemberInfo(
  entry: DD03PData,
  tableName: string,
): MemberInfo | null {
  const fieldName = entry.FIELDNAME ?? '';

  // .INCLU-<SUFFIX> entries → include with suffix
  if (fieldName.startsWith('.INCLU-')) {
    const includeName = entry.PRECFIELD ?? '';
    if (!includeName) return null;
    // Extract suffix from .INCLU-<SUFFIX> (e.g., ".INCLU-_XX" → "_xx")
    const suffix = fieldName.slice('.INCLU-'.length).toLowerCase();
    return {
      kind: 'include',
      name: includeName.toLowerCase(),
      suffix,
    };
  }

  // Include directive → plain include
  if (fieldName === '.INCLUDE') {
    const includeName = entry.PRECFIELD ?? '';
    if (!includeName) return null;
    return {
      kind: 'include',
      name: includeName.toLowerCase(),
    };
  }

  // Structure-typed field (COMPTYPE = 'S', not an include)
  if (entry.COMPTYPE === 'S' && entry.DATATYPE === 'STRU') {
    const rollname = entry.ROLLNAME ?? fieldName;
    return buildTypedFieldInfo(fieldName, rollname.toLowerCase(), entry);
  }

  // Data element reference (COMPTYPE = 'E')
  if (entry.COMPTYPE === 'E' && entry.ROLLNAME) {
    return buildTypedFieldInfo(fieldName, entry.ROLLNAME.toLowerCase(), entry);
  }

  // Built-in type field
  const cdsType = buildCdsTypeString(entry);
  if (!cdsType) return null;

  return buildTypedFieldInfo(
    fieldName,
    cdsType,
    entry,
    semanticsAnnotations(entry, tableName),
  );
}

/**
 * Pre-process DD03P entries into structured field info for emission.
 */
function buildFieldInfos(
  entries: DD03PData[],
  tableName: string,
): MemberInfo[] {
  const result: MemberInfo[] = [];

  for (const entry of entries) {
    const info = buildMemberInfo(entry, tableName);
    if (info) result.push(info);
  }

  return result;
}

/**
 * Build the CDS type string from a DD03P entry.
 * E.g., "abap.char(10)", "abap.dec(15,2)", "abap.int4"
 */
function buildCdsTypeString(entry: DD03PData): string | null {
  const datatype = entry.DATATYPE;
  if (!datatype) return null;

  const cdsName = DATATYPE_TO_CDS[datatype];
  if (!cdsName) return null;

  // Fixed-length types without parameters
  if (NO_LENGTH_TYPES.has(cdsName)) {
    return `abap.${cdsName}`;
  }

  // Parse LENG and DECIMALS (strip leading zeros)
  const leng = entry.LENG ? Number.parseInt(entry.LENG, 10) : undefined;
  const decimals = entry.DECIMALS
    ? Number.parseInt(entry.DECIMALS, 10)
    : undefined;

  // Variable-length types (string, rawstring)
  if (VARIABLE_LENGTH_TYPES.has(cdsName)) {
    if (leng && leng > 0) {
      return `abap.${cdsName}(${leng})`;
    }
    return `abap.${cdsName}(0)`;
  }

  // Types with decimals
  if (DECIMAL_TYPES.has(cdsName) && leng !== undefined) {
    const dec = decimals ?? 0;
    return `abap.${cdsName}(${leng},${dec})`;
  }

  // Types with length only
  if (leng !== undefined) {
    return `abap.${cdsName}(${leng})`;
  }

  // Fallback: no parameters
  return `abap.${cdsName}`;
}

/**
 * Escape single quotes in annotation string values
 */
function escapeAnnotationString(value: string): string {
  return value.replaceAll("'", "''");
}

// ============================================
// XML parsing
// ============================================

import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
  isArray: (name) => name === 'DD03P',
});

/**
 * Parse abapGit TABL XML content and extract DD02V/DD03P data.
 */
export function parseTablXml(xmlContent: string): {
  dd02v: DD02VData;
  dd03p: DD03PData[];
} {
  const parsed = xmlParser.parse(xmlContent);
  const values = parsed?.abapGit?.abap?.values ?? {};

  const dd02v: DD02VData = values.DD02V ?? {};

  // DD03P can be inside DD03P_TABLE or directly as array
  let dd03pRaw = values.DD03P_TABLE?.DD03P ?? [];
  if (!Array.isArray(dd03pRaw)) {
    dd03pRaw = [dd03pRaw];
  }

  return { dd02v, dd03p: dd03pRaw };
}

// ============================================
// Convenience: parse XML and build DDL
// ============================================

/**
 * Parse abapGit TABL XML and build CDS DDL source.
 *
 * @param xmlContent - Raw XML content of a .tabl.xml file
 * @returns CDS DDL source string
 */
export function tablXmlToCdsDdl(xmlContent: string): string {
  const { dd02v, dd03p } = parseTablXml(xmlContent);
  return buildCdsDdl(dd02v, dd03p);
}
