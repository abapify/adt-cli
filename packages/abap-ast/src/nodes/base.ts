import { AbapAstError } from './errors';

/** All node kinds in the AST. */
export type NodeKind =
  // types
  | 'BuiltinType'
  | 'TableType'
  | 'StructureType'
  | 'NamedTypeRef'
  | 'EnumType'
  | 'TypeDef'
  // data
  | 'DataDecl'
  | 'ConstantDecl'
  | 'FieldSymbolDecl'
  // statements
  | 'Assign'
  | 'Call'
  | 'Raise'
  | 'If'
  | 'Loop'
  | 'Return'
  | 'Try'
  | 'Append'
  | 'Insert'
  | 'Read'
  | 'Clear'
  | 'Exit'
  | 'Continue'
  | 'Raw'
  // expressions
  | 'Literal'
  | 'IdentifierExpr'
  | 'ConstructorExpr'
  | 'MethodCallExpr'
  | 'BinOp'
  | 'StringTemplate'
  | 'Cast'
  // members
  | 'MethodParam'
  | 'MethodDef'
  | 'MethodImpl'
  | 'EventDef'
  | 'AttributeDef'
  // class / interface
  | 'Section'
  | 'ClassDef'
  | 'LocalClassDef'
  | 'InterfaceDef'
  // shared
  | 'Comment';

/** Base shape for any AST node. */
export interface AbapNode {
  readonly kind: NodeKind;
}

/** An ABAP identifier (not validated beyond presence). */
export type Identifier = string;

/** An ABAP comment. Star comments begin at column 1; line comments use `"`. */
export interface Comment extends AbapNode {
  readonly kind: 'Comment';
  readonly text: string;
  readonly style: 'star' | 'line';
}

export function comment(input: {
  text: string;
  style?: 'star' | 'line';
}): Comment {
  if (typeof input.text !== 'string') {
    throw new AbapAstError('Comment: required field "text" is missing');
  }
  return Object.freeze({
    kind: 'Comment' as const,
    text: input.text,
    style: input.style ?? 'line',
  });
}

/** Visibility modifier for class members / sections. */
export type Visibility = 'public' | 'protected' | 'private';
