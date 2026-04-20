import type { Writer } from './writer';
import type { AbapDoc } from '../nodes/base';
import type { TypeRef, EnumType, TypeDef } from '../nodes/types';

/**
 * Emit each ABAPDoc line as `"! <line>` at the current indent, immediately
 * above the following declaration. Does nothing when `doc` is undefined or
 * empty. Content is passed through verbatim — tabs and special characters
 * are preserved.
 */
export function printAbapDoc(doc: AbapDoc | undefined, writer: Writer): void {
  if (!doc || doc.length === 0) return;
  for (const line of doc) {
    writer.writeLine(line.length === 0 ? '"!' : `"! ${line}`);
  }
}

/** Print a TypeRef as an inline type expression (e.g. 'string', 'i', 'zcl_foo'). */
export function printInlineType(type: TypeRef, writer: Writer): string {
  switch (type.kind) {
    case 'BuiltinType': {
      const parts: string[] = [type.name];
      if (type.length !== undefined) {
        parts.push(`${writer.kw('LENGTH')} ${type.length}`);
      }
      if (type.decimals !== undefined) {
        parts.push(`${writer.kw('DECIMALS')} ${type.decimals}`);
      }
      return parts.join(' ');
    }
    case 'NamedTypeRef':
      return type.name;
    case 'TableType':
      throw new Error(
        'printInlineType: TableType cannot be used as an inline type reference',
      );
    case 'StructureType':
      throw new Error(
        'printInlineType: StructureType cannot be used as an inline type reference',
      );
  }
}

/** Print a TYPES top-level declaration. */
export function printTypeDef(node: TypeDef, writer: Writer): void {
  printAbapDoc(node.abapDoc, writer);
  const K = (s: string): string => writer.kw(s);
  const t: TypeRef | EnumType = node.type;
  if (t.kind === 'StructureType') {
    writer.writeLine(`${K('TYPES')}: ${K('BEGIN OF')} ${node.name},`);
    writer.indent();
    const maxName = Math.max(...t.fields.map((f) => f.name.length));
    t.fields.forEach((f) => {
      const pad = ' '.repeat(maxName - f.name.length);
      writer.writeLine(
        `${f.name}${pad} ${K('TYPE')} ${printInlineType(f.type, writer)},`,
      );
    });
    writer.dedent();
    writer.writeLine(`${K('END OF')} ${node.name}.`);
    return;
  }
  if (t.kind === 'TableType') {
    const kindKw =
      t.tableKind === 'standard'
        ? K('STANDARD')
        : t.tableKind === 'sorted'
          ? K('SORTED')
          : K('HASHED');
    const row = printInlineType(t.rowType, writer);
    let key: string;
    if (t.keyFields && t.keyFields.length > 0) {
      const uniq = t.uniqueness === 'unique' ? K('UNIQUE') : K('NON-UNIQUE');
      key = `${K('WITH')} ${uniq} ${K('KEY')} ${t.keyFields.join(' ')}`;
    } else {
      key = `${K('WITH')} ${K('DEFAULT KEY')}`;
    }
    writer.writeLine(
      `${K('TYPES')} ${node.name} ${K('TYPE')} ${kindKw} ${K('TABLE OF')} ${row} ${key}.`,
    );
    return;
  }
  if (t.kind === 'EnumType') {
    writer.writeLine(
      `${K('TYPES')}: ${K('BEGIN OF ENUM')} ${node.name} ${K('BASE TYPE')} ${printInlineType(t.baseType, writer)},`,
    );
    writer.indent();
    const maxName = Math.max(...t.members.map((m) => m.name.length));
    t.members.forEach((m) => {
      const pad = ' '.repeat(maxName - m.name.length);
      const val =
        typeof m.value === 'number' ? String(m.value) : `'${m.value}'`;
      writer.writeLine(`${m.name}${pad} ${K('VALUE')} ${val},`);
    });
    writer.dedent();
    writer.writeLine(`${K('END OF ENUM')} ${node.name}.`);
    return;
  }
  // BuiltinType or NamedTypeRef
  writer.writeLine(
    `${K('TYPES')} ${node.name} ${K('TYPE')} ${printInlineType(t, writer)}.`,
  );
}
