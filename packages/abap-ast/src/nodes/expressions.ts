import type { AbapNode, Identifier } from './base';
import { AbapAstError } from './errors';
import type { TypeRef } from './types';

/** An expression node (forward-declared union). */
export type Expression =
  | Literal
  | IdentifierExpr
  | ConstructorExpr
  | MethodCallExpr
  | BinOp
  | StringTemplate
  | Cast;

/** A literal value. */
export interface Literal extends AbapNode {
  readonly kind: 'Literal';
  readonly literalKind: 'string' | 'int' | 'bool' | 'hex';
  readonly value: string | number | boolean;
}

export function literal(input: {
  literalKind: 'string' | 'int' | 'bool' | 'hex';
  value: string | number | boolean;
}): Literal {
  if (!input.literalKind) {
    throw new AbapAstError('Literal: required field "literalKind" is missing');
  }
  if (input.value === undefined || input.value === null) {
    throw new AbapAstError('Literal: required field "value" is missing');
  }
  if (input.literalKind === 'int' && typeof input.value !== 'number') {
    throw new AbapAstError('Literal: int literal requires a number value');
  }
  if (input.literalKind === 'bool' && typeof input.value !== 'boolean') {
    throw new AbapAstError('Literal: bool literal requires a boolean value');
  }
  if (
    (input.literalKind === 'string' || input.literalKind === 'hex') &&
    typeof input.value !== 'string'
  ) {
    throw new AbapAstError(
      `Literal: ${input.literalKind} literal requires a string value`,
    );
  }
  return Object.freeze({
    kind: 'Literal' as const,
    literalKind: input.literalKind,
    value: input.value,
  });
}

/** A bare identifier used as an expression (variable, constant reference). */
export interface IdentifierExpr extends AbapNode {
  readonly kind: 'IdentifierExpr';
  readonly name: Identifier;
}

export function identifierExpr(input: { name: Identifier }): IdentifierExpr {
  if (!input.name) {
    throw new AbapAstError('IdentifierExpr: required field "name" is missing');
  }
  return Object.freeze({
    kind: 'IdentifierExpr' as const,
    name: input.name,
  });
}

/** Named argument on a method call / constructor. */
export interface NamedArg {
  readonly name: Identifier;
  readonly value: Expression;
}

/** `NEW <type>( ... )`. */
export interface ConstructorExpr extends AbapNode {
  readonly kind: 'ConstructorExpr';
  readonly type: TypeRef;
  readonly args: readonly NamedArg[];
}

export function constructorExpr(input: {
  type: TypeRef;
  args?: readonly NamedArg[];
}): ConstructorExpr {
  if (!input.type) {
    throw new AbapAstError('ConstructorExpr: required field "type" is missing');
  }
  return Object.freeze({
    kind: 'ConstructorExpr' as const,
    type: input.type,
    args: Object.freeze((input.args ?? []).map((a) => Object.freeze({ ...a }))),
  });
}

/** Chainable method call (static `cl=>m(...)` or instance `ref->m(...)`). */
export interface MethodCallExpr extends AbapNode {
  readonly kind: 'MethodCallExpr';
  readonly receiver: Expression | undefined;
  readonly method: Identifier;
  readonly callKind: 'static' | 'instance';
  readonly args: readonly NamedArg[];
}

export function methodCallExpr(input: {
  receiver?: Expression;
  method: Identifier;
  callKind: 'static' | 'instance';
  args?: readonly NamedArg[];
}): MethodCallExpr {
  if (!input.method) {
    throw new AbapAstError(
      'MethodCallExpr: required field "method" is missing',
    );
  }
  if (input.callKind === 'instance' && !input.receiver) {
    throw new AbapAstError('MethodCallExpr: instance calls require a receiver');
  }
  return Object.freeze({
    kind: 'MethodCallExpr' as const,
    receiver: input.receiver,
    method: input.method,
    callKind: input.callKind,
    args: Object.freeze((input.args ?? []).map((a) => Object.freeze({ ...a }))),
  });
}

/** Comparison / arithmetic operators. */
export type BinOperator =
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | '+'
  | '-'
  | '*'
  | '/'
  | 'AND'
  | 'OR';

export interface BinOp extends AbapNode {
  readonly kind: 'BinOp';
  readonly op: BinOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export function binOp(input: {
  op: BinOperator;
  left: Expression;
  right: Expression;
}): BinOp {
  if (!input.op) {
    throw new AbapAstError('BinOp: required field "op" is missing');
  }
  if (!input.left) {
    throw new AbapAstError('BinOp: required field "left" is missing');
  }
  if (!input.right) {
    throw new AbapAstError('BinOp: required field "right" is missing');
  }
  return Object.freeze({
    kind: 'BinOp' as const,
    op: input.op,
    left: input.left,
    right: input.right,
  });
}

/** Parts of a string template — literal text or an interpolated expression. */
export type StringTemplatePart =
  | { readonly partKind: 'text'; readonly text: string }
  | { readonly partKind: 'expr'; readonly expr: Expression };

/** `|text { expr } more|`. */
export interface StringTemplate extends AbapNode {
  readonly kind: 'StringTemplate';
  readonly parts: readonly StringTemplatePart[];
}

export function stringTemplate(input: {
  parts: readonly StringTemplatePart[];
}): StringTemplate {
  if (!input.parts) {
    throw new AbapAstError('StringTemplate: required field "parts" is missing');
  }
  return Object.freeze({
    kind: 'StringTemplate' as const,
    parts: Object.freeze(input.parts.map((p) => Object.freeze({ ...p }))),
  });
}

/** `CAST <type>( expr )`. */
export interface Cast extends AbapNode {
  readonly kind: 'Cast';
  readonly type: TypeRef;
  readonly expr: Expression;
}

export function cast(input: { type: TypeRef; expr: Expression }): Cast {
  if (!input.type) {
    throw new AbapAstError('Cast: required field "type" is missing');
  }
  if (!input.expr) {
    throw new AbapAstError('Cast: required field "expr" is missing');
  }
  return Object.freeze({
    kind: 'Cast' as const,
    type: input.type,
    expr: input.expr,
  });
}
