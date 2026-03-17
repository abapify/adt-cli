/**
 * CDS AST → abapGit DD02V/DD03P Mapping
 *
 * Transforms @abapify/acds AST nodes into DD02V (header) and DD03P (field)
 * data structures for abapGit XML serialization.
 */

import type {
  TableDefinition,
  StructureDefinition,
  Annotation,
  AnnotationValue,
  FieldDefinition,
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
  DDTEXT?: string;
  CONTFLAG?: string;
  EXCLASS?: string;
  MASTERLANG?: string;
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
  NOTNULL?: string;
  COMPTYPE?: string;
  INTTYPE?: string;
  INTLEN?: string;
  DATATYPE?: string;
  LENG?: string;
  DECIMALS?: string;
  MASK?: string;
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

  // CLIDEP — set to 'X' if table has a client-type field
  const fields = def.members.filter(
    (m): m is FieldDefinition => !('kind' in m && m.kind === 'include'),
  );
  const hasClientField = fields.some(
    (f) =>
      (f.type.kind === 'builtin' && f.type.name === 'clnt') ||
      (f.type.kind === 'named' && f.type.name.toLowerCase() === 'mandt'),
  );

  // Build result in standard abapGit DD02V field order:
  // TABNAME, DDLANGUAGE, TABCLASS, CLIDEP, DDTEXT, MASTERLANG, CONTFLAG, EXCLASS
  const result: DD02VData = {};
  result.TABNAME = def.name.toUpperCase();
  result.DDLANGUAGE = language;
  result.TABCLASS = tabclass;
  if (hasClientField) result.CLIDEP = 'X';
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
  length?: number;
  decimals?: number;
  fixedIntlen?: number;
}

const BUILTIN_TYPES: Record<string, BuiltinType> = {
  char: { datatype: 'CHAR', inttype: 'C' },
  clnt: { datatype: 'CLNT', inttype: 'C', length: 3 },
  numc: { datatype: 'NUMC', inttype: 'N' },
  dats: { datatype: 'DATS', inttype: 'D', length: 8 },
  tims: { datatype: 'TIMS', inttype: 'T', length: 6 },
  string: { datatype: 'STRG', inttype: 'g', fixedIntlen: 8 },
  xstring: { datatype: 'RSTR', inttype: 'h', fixedIntlen: 8 },
  int1: { datatype: 'INT1', inttype: 'b', fixedIntlen: 3 },
  int2: { datatype: 'INT2', inttype: 's', fixedIntlen: 5 },
  int4: { datatype: 'INT4', inttype: 'I', fixedIntlen: 4 },
  int8: { datatype: 'INT8', inttype: '8', fixedIntlen: 8 },
  fltp: { datatype: 'FLTP', inttype: 'F', fixedIntlen: 8 },
  dec: { datatype: 'DEC', inttype: 'P' },
  curr: { datatype: 'CURR', inttype: 'P' },
  quan: { datatype: 'QUAN', inttype: 'P' },
  raw: { datatype: 'RAW', inttype: 'X' },
  rawstring: { datatype: 'RSTR', inttype: 'h', fixedIntlen: 8 },
  lang: { datatype: 'LANG', inttype: 'C', length: 1 },
  unit: { datatype: 'UNIT', inttype: 'C' },
  cuky: { datatype: 'CUKY', inttype: 'C' },
  d16n: { datatype: 'D16N', inttype: 'a', fixedIntlen: 8 },
  d34n: { datatype: 'D34N', inttype: 'e', fixedIntlen: 16 },
  utclong: { datatype: 'UTCL', inttype: 'p', fixedIntlen: 8 },
};

/**
 * Types that always get a MASK (2 spaces + DATATYPE)
 */
const MASK_TYPES = new Set([
  'clnt',
  'string',
  'xstring',
  'rawstring',
  'lang',
  'unit',
  'cuky',
  'dats',
  'tims',
  'dec',
  'curr',
  'quan',
  'd16n',
  'd34n',
  'utclong',
]);

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
function buildFieldDD03P(field: FieldDefinition): DD03PData {
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

  if (field.type.kind === 'builtin') {
    const bt = field.type as BuiltinTypeRef;
    const typeInfo = BUILTIN_TYPES[bt.name];
    if (typeInfo) {
      const length = bt.length ?? typeInfo.length;
      inttype = typeInfo.inttype;
      intlen = zeroPad(computeIntlen(typeInfo, length), 6);
      datatype = typeInfo.datatype;
      if (length !== undefined) leng = zeroPad(length, 6);
      if (bt.decimals !== undefined) decimals = zeroPad(bt.decimals, 6);
      if (MASK_TYPES.has(bt.name)) mask = `  ${typeInfo.datatype}`;
    }
  } else {
    // Named type (data element reference)
    rollname = field.type.name.toUpperCase();
    comptype = 'E';
  }

  // Build in standard abapGit DD03P field order:
  // FIELDNAME, KEYFLAG, ROLLNAME, ADMINFIELD, INTTYPE, INTLEN, NOTNULL, DATATYPE, LENG, DECIMALS, MASK, COMPTYPE
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
  if (mask) result.MASK = mask;
  if (comptype) result.COMPTYPE = comptype;

  return result;
}

/**
 * Build DD03P entries from table/structure members
 */
export function buildDD03P(members: TableMember[]): DD03PData[] {
  const fields = members.filter(
    (m): m is FieldDefinition => !('kind' in m && m.kind === 'include'),
  );
  return fields.map((field) => buildFieldDD03P(field));
}
