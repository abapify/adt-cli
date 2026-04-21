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
  if (dd02v.DDTEXT) {
    lines.push(
      `@EndUserText.label : '${escapeAnnotationString(dd02v.DDTEXT)}'`,
    );
  }

  if (dd02v.EXCLASS) {
    const cat = ENHANCEMENT_CATEGORY_REVERSE[dd02v.EXCLASS];
    if (cat) {
      lines.push(`@AbapCatalog.enhancement.category : ${cat}`);
    }
  }

  if (!isStructure) {
    // Table-specific annotations
    if (dd02v.TABCLASS) {
      const cat = TABLE_CATEGORY_REVERSE[dd02v.TABCLASS];
      if (cat) {
        lines.push(`@AbapCatalog.tableCategory : ${cat}`);
      }
    }

    if (dd02v.CONTFLAG) {
      const dc = DELIVERY_CLASS_REVERSE[dd02v.CONTFLAG];
      if (dc) {
        lines.push(`@AbapCatalog.deliveryClass : ${dc}`);
      }
    }

    if (dd02v.MATEFLAG !== undefined) {
      const dm = DATA_MAINTENANCE_REVERSE[dd02v.MATEFLAG ?? ''];
      if (dm) {
        lines.push(`@AbapCatalog.dataMaintenance : ${dm}`);
      }
    }
  }

  // --- Definition header ---
  const keyword = isStructure ? 'define structure' : 'define table';
  lines.push(`${keyword} ${tableName.toLowerCase()} {`, ''); // Blank line after opening brace (SAP format)

  // --- Sort fields by POSITION ---
  const sorted = [...dd03pEntries].sort((a, b) => {
    const posA = parseInt(a.POSITION ?? '0', 10);
    const posB = parseInt(b.POSITION ?? '0', 10);
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
 * Pre-process DD03P entries into structured field info for emission.
 */
function buildFieldInfos(
  entries: DD03PData[],
  tableName: string,
): MemberInfo[] {
  const result: MemberInfo[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const fieldName = entry.FIELDNAME ?? '';

    // .INCLU-<SUFFIX> entries → include with suffix
    if (fieldName.startsWith('.INCLU-')) {
      const includeName = entry.PRECFIELD ?? '';
      if (includeName) {
        // Extract suffix from .INCLU-<SUFFIX> (e.g., ".INCLU-_XX" → "_xx")
        const suffix = fieldName.slice('.INCLU-'.length).toLowerCase();
        result.push({
          kind: 'include',
          name: includeName.toLowerCase(),
          suffix,
        });
      }
      continue;
    }

    // Include directive → plain include
    if (fieldName === '.INCLUDE') {
      const includeName = entry.PRECFIELD ?? '';
      if (includeName) {
        result.push({
          kind: 'include',
          name: includeName.toLowerCase(),
        });
      }
      continue;
    }

    // Structure-typed field (COMPTYPE = 'S', not an include)
    if (entry.COMPTYPE === 'S' && entry.DATATYPE === 'STRU') {
      const isKey = entry.KEYFLAG === 'X';
      const notNull = entry.NOTNULL === 'X' || isKey;
      const rollname = entry.ROLLNAME ?? fieldName;

      const prefix = isKey
        ? `key ${fieldName.toLowerCase()}`
        : fieldName.toLowerCase();

      const typeStr = notNull
        ? `${rollname.toLowerCase()} not null`
        : rollname.toLowerCase();

      result.push({
        kind: 'field',
        prefix,
        typeStr,
        annotations: [],
      });
      continue;
    }

    // Data element reference (COMPTYPE = 'E')
    if (entry.COMPTYPE === 'E' && entry.ROLLNAME) {
      const isKey = entry.KEYFLAG === 'X';
      const notNull = entry.NOTNULL === 'X' || isKey;

      const prefix = isKey
        ? `key ${fieldName.toLowerCase()}`
        : fieldName.toLowerCase();

      const typeStr = notNull
        ? `${entry.ROLLNAME.toLowerCase()} not null`
        : entry.ROLLNAME.toLowerCase();

      result.push({
        kind: 'field',
        prefix,
        typeStr,
        annotations: [],
      });
      continue;
    }

    // Built-in type field
    const cdsType = buildCdsTypeString(entry);
    if (!cdsType) continue;

    const isKey = entry.KEYFLAG === 'X';
    const notNull = entry.NOTNULL === 'X' || isKey;
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

    const prefix = isKey
      ? `key ${fieldName.toLowerCase()}`
      : fieldName.toLowerCase();

    const typeStr = notNull ? `${cdsType} not null` : cdsType;

    result.push({
      kind: 'field',
      prefix,
      typeStr,
      annotations,
    });
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
  const leng = entry.LENG ? parseInt(entry.LENG, 10) : undefined;
  const decimals = entry.DECIMALS ? parseInt(entry.DECIMALS, 10) : undefined;

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
