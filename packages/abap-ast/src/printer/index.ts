import type { AbapNode } from '../nodes/base';
import type { PrintOptions } from './options';
import { resolveOptions } from './options';
import { Writer } from './writer';
import { printTypeDef } from './print-types';
import { printExpression } from './print-expressions';
import {
  printStatement,
  printDataDecl,
  printFieldSymbolDecl,
  printComment,
} from './print-statements';
import {
  printAttributeDef,
  printConstantDecl,
  printEventDef,
  printMethodDef,
  printMethodImpl,
} from './print-members';
import { printClassDef, printLocalClassDef } from './print-class';
import { printInterfaceDef } from './print-interface';

export type { PrintOptions, ResolvedPrintOptions } from './options';
export { Writer } from './writer';
export { printInlineType } from './print-types';
export { printExpression } from './print-expressions';

/** Pretty-print an ABAP AST node to source code. */
export function print(node: AbapNode, options?: PrintOptions): string {
  const writer = new Writer(resolveOptions(options));
  printNode(node, writer);
  return writer.toString();
}

function printNode(node: AbapNode, writer: Writer): void {
  switch (node.kind) {
    // Top-level / structural
    case 'ClassDef':
      printClassDef(node as Parameters<typeof printClassDef>[0], writer);
      return;
    case 'LocalClassDef':
      printLocalClassDef(
        node as Parameters<typeof printLocalClassDef>[0],
        writer,
      );
      return;
    case 'InterfaceDef':
      printInterfaceDef(
        node as Parameters<typeof printInterfaceDef>[0],
        writer,
      );
      return;
    // Type-level
    case 'TypeDef':
      printTypeDef(node as Parameters<typeof printTypeDef>[0], writer);
      return;
    case 'BuiltinType':
    case 'NamedTypeRef':
    case 'TableType':
    case 'StructureType':
    case 'EnumType':
      throw new Error(
        `print: ${node.kind} is not a top-level node — wrap it in a TypeDef`,
      );
    // Members
    case 'AttributeDef':
      printAttributeDef(
        node as Parameters<typeof printAttributeDef>[0],
        writer,
      );
      return;
    case 'MethodDef':
      printMethodDef(node as Parameters<typeof printMethodDef>[0], writer);
      return;
    case 'MethodImpl':
      printMethodImpl(node as Parameters<typeof printMethodImpl>[0], writer);
      return;
    case 'EventDef':
      printEventDef(node as Parameters<typeof printEventDef>[0], writer);
      return;
    case 'ConstantDecl':
      printConstantDecl(
        node as Parameters<typeof printConstantDecl>[0],
        writer,
      );
      return;
    case 'Section':
      throw new Error(
        'print: Section is an internal node — print its enclosing ClassDef/LocalClassDef instead',
      );
    case 'MethodParam':
      throw new Error(
        'print: MethodParam is an internal node — print its enclosing MethodDef',
      );
    // Data (as statement)
    case 'DataDecl':
      printDataDecl(node as Parameters<typeof printDataDecl>[0], writer);
      return;
    case 'FieldSymbolDecl':
      printFieldSymbolDecl(
        node as Parameters<typeof printFieldSymbolDecl>[0],
        writer,
      );
      return;
    // Statements
    case 'Assign':
    case 'Call':
    case 'Raise':
    case 'If':
    case 'Loop':
    case 'Return':
    case 'Try':
    case 'Append':
    case 'Insert':
    case 'Read':
    case 'Clear':
    case 'Exit':
    case 'Continue':
    case 'Raw':
      printStatement(node as Parameters<typeof printStatement>[0], writer);
      return;
    case 'Comment':
      printComment(node as Parameters<typeof printComment>[0], writer);
      return;
    // Expressions (printed as a single-line expression — no trailing period)
    case 'Literal':
    case 'IdentifierExpr':
    case 'ConstructorExpr':
    case 'MethodCallExpr':
    case 'BinOp':
    case 'StringTemplate':
    case 'Cast':
      writer.writeLine(
        printExpression(node as Parameters<typeof printExpression>[0], writer),
      );
      return;
  }
}
