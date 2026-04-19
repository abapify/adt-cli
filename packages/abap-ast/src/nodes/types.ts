import type { AbapNode, Identifier } from './base';
import { AbapAstError } from './errors';

/** ABAP builtin type names allowed in the AST. */
export type BuiltinTypeName =
  | 'i'
  | 'int8'
  | 'f'
  | 'decfloat34'
  | 'd'
  | 't'
  | 'timestampl'
  | 'string'
  | 'xstring'
  | 'abap_bool'
  | 'sysuuid_x16';

const BUILTIN_TYPE_NAMES: ReadonlySet<BuiltinTypeName> =
  new Set<BuiltinTypeName>([
    'i',
    'int8',
    'f',
    'decfloat34',
    'd',
    't',
    'timestampl',
    'string',
    'xstring',
    'abap_bool',
    'sysuuid_x16',
  ]);

export interface BuiltinType extends AbapNode {
  readonly kind: 'BuiltinType';
  readonly name: BuiltinTypeName;
  readonly length?: number;
  readonly decimals?: number;
}

export function builtinType(input: {
  name: BuiltinTypeName;
  length?: number;
  decimals?: number;
}): BuiltinType {
  if (!input.name) {
    throw new AbapAstError('BuiltinType: required field "name" is missing');
  }
  if (!BUILTIN_TYPE_NAMES.has(input.name)) {
    throw new AbapAstError(
      `BuiltinType: unknown builtin type "${String(input.name)}"`,
    );
  }
  return Object.freeze({
    kind: 'BuiltinType' as const,
    name: input.name,
    length: input.length,
    decimals: input.decimals,
  });
}

/** Reference to a named type (e.g. `zif_foo=>ty_bar`). */
export interface NamedTypeRef extends AbapNode {
  readonly kind: 'NamedTypeRef';
  readonly name: Identifier;
}

export function namedTypeRef(input: { name: Identifier }): NamedTypeRef {
  if (!input.name) {
    throw new AbapAstError('NamedTypeRef: required field "name" is missing');
  }
  return Object.freeze({ kind: 'NamedTypeRef' as const, name: input.name });
}

/** Type reference used in declarations. */
export type TypeRef = BuiltinType | NamedTypeRef | TableType | StructureType;

/** ABAP internal table type. */
export interface TableType extends AbapNode {
  readonly kind: 'TableType';
  readonly rowType: TypeRef;
  readonly tableKind: 'standard' | 'sorted' | 'hashed';
  readonly uniqueness?: 'unique' | 'non-unique';
  readonly keyFields?: readonly Identifier[];
}

export function tableType(input: {
  rowType: TypeRef;
  tableKind?: 'standard' | 'sorted' | 'hashed';
  uniqueness?: 'unique' | 'non-unique';
  keyFields?: readonly Identifier[];
}): TableType {
  if (!input.rowType) {
    throw new AbapAstError('TableType: required field "rowType" is missing');
  }
  return Object.freeze({
    kind: 'TableType' as const,
    rowType: input.rowType,
    tableKind: input.tableKind ?? 'standard',
    uniqueness: input.uniqueness,
    keyFields: input.keyFields
      ? Object.freeze([...input.keyFields])
      : undefined,
  });
}

/** Field of a structure type. */
export interface StructureField {
  readonly name: Identifier;
  readonly type: TypeRef;
}

/** ABAP `BEGIN OF ... END OF` structure type. */
export interface StructureType extends AbapNode {
  readonly kind: 'StructureType';
  readonly fields: readonly StructureField[];
}

export function structureType(input: {
  fields: readonly StructureField[];
}): StructureType {
  if (!input.fields || input.fields.length === 0) {
    throw new AbapAstError('StructureType: must declare at least one field');
  }
  for (const f of input.fields) {
    if (!f.name) {
      throw new AbapAstError('StructureType: field is missing "name"');
    }
    if (!f.type) {
      throw new AbapAstError(
        `StructureType: field "${f.name}" is missing "type"`,
      );
    }
  }
  return Object.freeze({
    kind: 'StructureType' as const,
    fields: Object.freeze(input.fields.map((f) => Object.freeze({ ...f }))),
  });
}

/** Enum-like type: a fixed set of name/value pairs with a base type. */
export interface EnumMember {
  readonly name: Identifier;
  readonly value: string | number;
}

export interface EnumType extends AbapNode {
  readonly kind: 'EnumType';
  readonly baseType: TypeRef;
  readonly members: readonly EnumMember[];
}

export function enumType(input: {
  baseType: TypeRef;
  members: readonly EnumMember[];
}): EnumType {
  if (!input.baseType) {
    throw new AbapAstError('EnumType: required field "baseType" is missing');
  }
  if (!input.members || input.members.length === 0) {
    throw new AbapAstError('EnumType: must declare at least one member');
  }
  for (const m of input.members) {
    if (!m.name) {
      throw new AbapAstError('EnumType: member is missing "name"');
    }
  }
  return Object.freeze({
    kind: 'EnumType' as const,
    baseType: input.baseType,
    members: Object.freeze(input.members.map((m) => Object.freeze({ ...m }))),
  });
}

/** Top-level `TYPES: <name> TYPE ...` declaration. */
export interface TypeDef extends AbapNode {
  readonly kind: 'TypeDef';
  readonly name: Identifier;
  readonly type: TypeRef | EnumType;
}

export function typeDef(input: {
  name: Identifier;
  type: TypeRef | EnumType;
}): TypeDef {
  if (!input.name) {
    throw new AbapAstError('TypeDef: required field "name" is missing');
  }
  if (!input.type) {
    throw new AbapAstError('TypeDef: required field "type" is missing');
  }
  return Object.freeze({
    kind: 'TypeDef' as const,
    name: input.name,
    type: input.type,
  });
}
