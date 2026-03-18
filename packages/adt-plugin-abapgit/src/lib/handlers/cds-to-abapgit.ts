/**
 * CDS AST → abapGit DD02V/DD03P Mapping
 *
 * Transforms @abapify/acds AST nodes into DD02V (header) and DD03P (field)
 * data structures for abapGit XML serialization.
 *
 * When a TypeResolver is provided, named type references are resolved via
 * ADT to determine whether they are data elements or structures, and to
 * extract metadata (search help origin, description) that is not available
 * from the CDS source alone.
 */

import type {
  TableDefinition,
  StructureDefinition,
  Annotation,
  AnnotationValue,
  FieldDefinition,
  IncludeDirective,
  BuiltinTypeRef,
  TableMember,
} from '@abapify/acds';

// ============================================
// DD02V / DD03P data types
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
}

// ============================================
// Type Resolver — resolves named types via ADT
// ============================================

/** Result of resolving a named type reference */
export interface ResolvedType {
  /** 'E' = data element, 'S' = structure */
  comptype: 'E' | 'S';
  /** Search help origin (e.g. 'D' for domain search help) */
  shlporigin?: string;
  /** Description text (used for include DDTEXT) */
  description?: string;
}

/**
 * Resolves named type references by querying ADT endpoints.
 * Caches results to avoid duplicate HTTP requests.
 */
export interface TypeResolver {
  resolve(name: string): Promise<ResolvedType>;
}

// ============================================
// Annotation helpers
// ============================================

/** Extract the string value from an annotation value node */
function annotationStringValue(val: AnnotationValue): string {
  switch (val.kind) {
    case 'string':
      return val.value;
    case 'enum':
      return val.value;
    case 'boolean':
      return val.value ? 'X' : '';
    case 'number':
      return String(val.value);
    default:
      return '';
  }
}

/** Find annotation by key and return its string value */
function getAnnotation(
  annotations: Annotation[],
  key: string,
): string | undefined {
  const ann = annotations.find((a) => a.key === key);
  return ann ? annotationStringValue(ann.value) : undefined;
}

// ============================================
// Annotation → DD02V Mapping
// ============================================

const TABLE_CATEGORY_MAP: Record<string, string> = {
  TRANSPARENT: 'TRANSP',
  CLUSTER: 'CLUSTER',
  POOL: 'POOL',
  APPEND: 'APPEND',
};

const ENHANCEMENT_CATEGORY_MAP: Record<string, string> = {
  NOT_EXTENSIBLE: '1',
  EXTENSIBLE_CHARACTER_NUMERIC: '2',
  EXTENSIBLE_CHARACTER: '3',
  EXTENSIBLE_ANY: '4',
  NOT_CLASSIFIED: '0',
};

const DATA_MAINTENANCE_MAP: Record<string, string> = {
  RESTRICTED: 'X',
  NOT_ALLOWED: 'N',
  ALLOWED: '',
};

/**
 * Build DD02V data from a parsed CDS table/structure definition
 */
export function buildDD02V(
  def: TableDefinition | StructureDefinition,
  language: string,
  description: string,
): DD02VData {
  // Compute all values first, then assemble in abapGit field order
  let tabclass = def.kind === 'structure' ? 'INTTAB' : 'TRANSP';

  const tableCategory = getAnnotation(
    def.annotations,
    'AbapCatalog.tableCategory',
  );
  if (tableCategory) {
    tabclass = TABLE_CATEGORY_MAP[tableCategory] || tabclass;
  }

  const deliveryClass = getAnnotation(
    def.annotations,
    'AbapCatalog.deliveryClass',
  );

  const enhancementCategory = getAnnotation(
    def.annotations,
    'AbapCatalog.enhancement.category',
  );

  // Detect language-dependent structure/table:
  // LANGDEP=X when any field references data element SPRAS or builtin type abap.lang
  const hasLanguageField = def.members.some((m) => {
    if ('kind' in m && m.kind === 'include') return false;
    const f = m as FieldDefinition;
    if (f.type.kind === 'named') return f.type.name.toUpperCase() === 'SPRAS';
    if (f.type.kind === 'builtin')
      return (f.type as BuiltinTypeRef).name === 'lang';
    return false;
  });

  // Build result in standard abapGit DD02V field order:
  // TABNAME, DDLANGUAGE, TABCLASS, LANGDEP, DDTEXT, MASTERLANG, CONTFLAG, EXCLASS
  const result: DD02VData = {};
  result.TABNAME = def.name.toUpperCase();
  result.DDLANGUAGE = language;
  result.TABCLASS = tabclass;
  if (hasLanguageField) result.LANGDEP = 'X';
  result.DDTEXT = description;
  result.MASTERLANG = language;
  if (deliveryClass) result.CONTFLAG = deliveryClass;
  if (enhancementCategory)
    result.EXCLASS = ENHANCEMENT_CATEGORY_MAP[enhancementCategory];

  return result;
}

// ============================================
// Field → DD03P Mapping
// ============================================

interface BuiltinType {
  datatype: string;
  inttype: string;
  /** Fixed DDIC length (for types without user-specified length) */
  length?: number;
  /** Fixed DDIC decimals (e.g. FLTP always has 16) */
  decimals?: number;
  /** Fixed internal byte length (overrides computed INTLEN) */
  fixedIntlen?: number;
  /** Whether this type has no LENG in the DDIC (variable-length types) */
  noLeng?: boolean;
  /** SHLPORIGIN value for search help (T = table-driven) */
  shlporigin?: string;
}

// DDIC INTTYPE/INTLEN mapping based on SAP abapGit serialization:
// - INT1/INT2/INT4 use INTTYPE=X with raw byte-size INTLEN
// - DATS/TIMS/DATN/TIMN use Unicode-doubled INTLEN
// - String/rawstring have fixedIntlen=8 and no LENG
const BUILTIN_TYPES: Record<string, BuiltinType> = {
  char: { datatype: 'CHAR', inttype: 'C' },
  clnt: { datatype: 'CLNT', inttype: 'C', length: 3 },
  numc: { datatype: 'NUMC', inttype: 'N' },
  dats: {
    datatype: 'DATS',
    inttype: 'D',
    length: 8,
    fixedIntlen: 16,
    shlporigin: 'T',
  },
  datn: {
    datatype: 'DATN',
    inttype: 'D',
    length: 8,
    fixedIntlen: 16,
    shlporigin: 'T',
  },
  tims: {
    datatype: 'TIMS',
    inttype: 'T',
    length: 6,
    fixedIntlen: 12,
    shlporigin: 'T',
  },
  timn: {
    datatype: 'TIMN',
    inttype: 'T',
    length: 6,
    fixedIntlen: 12,
    shlporigin: 'T',
  },
  string: { datatype: 'STRG', inttype: 'g', fixedIntlen: 8, noLeng: true },
  xstring: { datatype: 'RSTR', inttype: 'y', fixedIntlen: 8, noLeng: true },
  int1: { datatype: 'INT1', inttype: 'X', length: 3, fixedIntlen: 1 },
  int2: { datatype: 'INT2', inttype: 'X', length: 5, fixedIntlen: 2 },
  int4: { datatype: 'INT4', inttype: 'X', length: 10, fixedIntlen: 4 },
  int8: { datatype: 'INT8', inttype: '8', length: 19, fixedIntlen: 8 },
  fltp: {
    datatype: 'FLTP',
    inttype: 'F',
    length: 16,
    decimals: 16,
    fixedIntlen: 8,
  },
  dec: { datatype: 'DEC', inttype: 'P' },
  curr: { datatype: 'CURR', inttype: 'P' },
  quan: { datatype: 'QUAN', inttype: 'P' },
  raw: { datatype: 'RAW', inttype: 'X' },
  rawstring: { datatype: 'RSTR', inttype: 'y', fixedIntlen: 8, noLeng: true },
  lang: { datatype: 'LANG', inttype: 'C', length: 1 },
  unit: { datatype: 'UNIT', inttype: 'C', length: 3 },
  cuky: { datatype: 'CUKY', inttype: 'C', length: 5 },
  d16n: { datatype: 'D16N', inttype: 'a', fixedIntlen: 8 },
  d34n: { datatype: 'D34N', inttype: 'e', fixedIntlen: 16 },
  utclong: { datatype: 'UTCL', inttype: 'p', length: 27, fixedIntlen: 8 },
};

/** Zero-pad number to given width */
function zeroPad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Compute internal length from type info */
function computeIntlen(builtin: BuiltinType, length?: number): number {
  if (builtin.fixedIntlen !== undefined) return builtin.fixedIntlen;

  // Packed decimal types: ceil((length + 1) / 2)
  if (builtin.inttype === 'P' && length !== undefined) {
    return Math.ceil((length + 1) / 2);
  }

  // Raw bytes: length directly
  if (builtin.inttype === 'X' && length !== undefined) {
    return length;
  }

  // Character types: length * 2 (Unicode)
  if (length !== undefined) {
    return length * 2;
  }

  // Fixed-length types with known length
  if (builtin.length !== undefined) {
    return builtin.length * 2;
  }

  return 0;
}

/** Build a DD03P entry from a single field definition */
async function buildFieldDD03P(
  field: FieldDefinition,
  tableName: string,
  resolver?: TypeResolver,
): Promise<DD03PData> {
  // Compute all values first
  const isKey = field.isKey;
  const notNull = field.notNull;
  let rollname: string | undefined;
  let comptype: string | undefined;
  let inttype: string | undefined;
  let intlen: string | undefined;
  let datatype: string | undefined;
  let leng: string | undefined;
  let decimals: string | undefined;
  let mask: string | undefined;
  let shlporigin: string | undefined;
  let reftable: string | undefined;
  let reffield: string | undefined;

  if (field.type.kind === 'builtin') {
    const bt = field.type as BuiltinTypeRef;
    const typeInfo = BUILTIN_TYPES[bt.name];
    if (typeInfo) {
      // Use explicit CDS length, or fall back to fixed DDIC length
      const length = bt.length ?? typeInfo.length;
      inttype = typeInfo.inttype;
      intlen = zeroPad(computeIntlen(typeInfo, length), 6);
      datatype = typeInfo.datatype;

      // LENG: skip for variable-length types (string, xstring, rawstring)
      if (!typeInfo.noLeng && length !== undefined) {
        leng = zeroPad(length, 6);
      }

      // DECIMALS: use explicit CDS decimals, or fixed DDIC decimals
      const dec = bt.decimals ?? typeInfo.decimals;
      if (dec !== undefined) decimals = zeroPad(dec, 6);

      // MASK: all builtin types get "  DATATYPE"
      mask = `  ${typeInfo.datatype}`;

      // SHLPORIGIN (date/time types)
      if (typeInfo.shlporigin) shlporigin = typeInfo.shlporigin;

      // REFTABLE/REFFIELD for currency and quantity fields
      // These come from CDS annotations on the field
      // Annotation value is 'tablename.fieldname' — we only need the field part
      if (bt.name === 'curr' || bt.name === 'quan') {
        const refAnnotation = getAnnotation(
          field.annotations,
          bt.name === 'curr'
            ? 'Semantics.amount.currencyCode'
            : 'Semantics.quantity.unitOfMeasure',
        );
        if (refAnnotation) {
          reftable = tableName;
          // Strip table prefix if present (e.g. 'ztest.currency_code' → 'CURRENCY_CODE')
          const parts = refAnnotation.split('.');
          reffield = parts[parts.length - 1].toUpperCase();
        }
      }
    }
  } else {
    // Named type reference — resolve via ADT if available
    rollname = field.type.name.toUpperCase();
    comptype = 'E'; // Default: data element
    if (resolver) {
      const resolved = await resolver.resolve(field.type.name);
      comptype = resolved.comptype;
      if (resolved.shlporigin) shlporigin = resolved.shlporigin;
      if (resolved.comptype === 'S') {
        datatype = 'STRU';
        mask = '  STRUS';
      }
    }
  }

  // Build in standard abapGit DD03P field order (matches DD03P structure definition):
  // FIELDNAME, KEYFLAG, ROLLNAME, ADMINFIELD, INTTYPE, INTLEN, NOTNULL,
  // DATATYPE, LENG, DECIMALS, SHLPORIGIN, MASK, COMPTYPE, REFTABLE, REFFIELD
  const result: DD03PData = {};
  result.FIELDNAME = field.name.toUpperCase();
  if (isKey) result.KEYFLAG = 'X';
  if (rollname) result.ROLLNAME = rollname;
  result.ADMINFIELD = '0';
  if (inttype) result.INTTYPE = inttype;
  if (intlen) result.INTLEN = intlen;
  if (notNull) result.NOTNULL = 'X';
  if (datatype) result.DATATYPE = datatype;
  if (leng) result.LENG = leng;
  if (decimals) result.DECIMALS = decimals;
  if (shlporigin) result.SHLPORIGIN = shlporigin;
  if (mask) result.MASK = mask;
  if (comptype) result.COMPTYPE = comptype;
  if (reftable) result.REFTABLE = reftable;
  if (reffield) result.REFFIELD = reffield;

  return result;
}

/**
 * Build DD03P entries from table/structure members
 */
export async function buildDD03P(
  members: TableMember[],
  tableName: string = '',
  resolver?: TypeResolver,
): Promise<DD03PData[]> {
  const entries: DD03PData[] = [];

  for (const member of members) {
    if ('kind' in member && member.kind === 'include') {
      const inc = member as IncludeDirective;
      const includeName = inc.name.toUpperCase();

      // Resolve include description via ADT if available
      let ddtext: string | undefined;
      if (resolver) {
        const resolved = await resolver.resolve(inc.name);
        ddtext = resolved.description;
      }

      if (inc.suffix) {
        // Include with suffix → .INCLU-<SUFFIX> entry
        const entry: DD03PData = {
          FIELDNAME: `.INCLU-${inc.suffix.toUpperCase()}`,
          ADMINFIELD: '0',
          PRECFIELD: includeName,
          MASK: '      S',
          COMPTYPE: 'S',
        };
        if (ddtext) entry.DDTEXT = ddtext;
        entries.push(entry);
      } else {
        // Plain include → .INCLUDE entry
        const entry: DD03PData = {
          FIELDNAME: '.INCLUDE',
          ADMINFIELD: '0',
          PRECFIELD: includeName,
          MASK: '      S',
          COMPTYPE: 'S',
        };
        if (ddtext) entry.DDTEXT = ddtext;
        entries.push(entry);
      }
    } else {
      // Regular field definition
      const field = member as FieldDefinition;
      entries.push(await buildFieldDD03P(field, tableName, resolver));
    }
  }

  return entries;
}
