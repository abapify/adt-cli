import type { AbapNode, Comment, Identifier } from './base';
import { AbapAstError } from './errors';
import type { Expression, NamedArg } from './expressions';
import type { TypeRef } from './types';
import type { DataDecl, FieldSymbolDecl } from './data';

/** Union of all statement node types. */
export type Statement =
  | Assign
  | Call
  | Raise
  | If
  | Loop
  | Return
  | Try
  | Append
  | Insert
  | Read
  | Clear
  | Exit
  | Continue
  | Raw
  | Comment
  | DataDecl
  | FieldSymbolDecl;

/** `target = value`. */
export interface Assign extends AbapNode {
  readonly kind: 'Assign';
  readonly target: Expression;
  readonly value: Expression;
}

export function assign(input: {
  target: Expression;
  value: Expression;
}): Assign {
  if (!input.target) {
    throw new AbapAstError('Assign: required field "target" is missing');
  }
  if (!input.value) {
    throw new AbapAstError('Assign: required field "value" is missing');
  }
  return Object.freeze({
    kind: 'Assign' as const,
    target: input.target,
    value: input.value,
  });
}

/** Statement-level method call, e.g. `cl_foo=>bar( iv = 1 ).`. */
export interface Call extends AbapNode {
  readonly kind: 'Call';
  readonly receiver: Expression | undefined;
  readonly method: Identifier;
  readonly callKind: 'static' | 'instance';
  readonly args: readonly NamedArg[];
}

export function call(input: {
  receiver?: Expression;
  method: Identifier;
  callKind: 'static' | 'instance';
  args?: readonly NamedArg[];
}): Call {
  if (!input.method) {
    throw new AbapAstError('Call: required field "method" is missing');
  }
  if (input.callKind !== 'static' && input.callKind !== 'instance') {
    throw new AbapAstError(
      'Call: required field "callKind" must be "static" or "instance"',
    );
  }
  if (input.callKind === 'instance' && !input.receiver) {
    throw new AbapAstError('Call: instance calls require a receiver');
  }
  return Object.freeze({
    kind: 'Call' as const,
    receiver: input.receiver,
    method: input.method,
    callKind: input.callKind,
    args: Object.freeze((input.args ?? []).map((a) => Object.freeze({ ...a }))),
  });
}

/** `RAISE EXCEPTION NEW zcx_xxx( ... ).`. */
export interface Raise extends AbapNode {
  readonly kind: 'Raise';
  readonly exceptionType: TypeRef;
  readonly args: readonly NamedArg[];
}

export function raise(input: {
  exceptionType: TypeRef;
  args?: readonly NamedArg[];
}): Raise {
  if (!input.exceptionType) {
    throw new AbapAstError('Raise: required field "exceptionType" is missing');
  }
  return Object.freeze({
    kind: 'Raise' as const,
    exceptionType: input.exceptionType,
    args: Object.freeze((input.args ?? []).map((a) => Object.freeze({ ...a }))),
  });
}

/** A single ELSEIF branch. */
export interface ElseIfBranch {
  readonly condition: Expression;
  readonly body: readonly Statement[];
}

/** IF / ELSEIF / ELSE. */
export interface If extends AbapNode {
  readonly kind: 'If';
  readonly condition: Expression;
  readonly thenBody: readonly Statement[];
  readonly elseIfs: readonly ElseIfBranch[];
  readonly else?: readonly Statement[];
}

export function ifStmt(input: {
  condition: Expression;
  thenBody: readonly Statement[];
  elseIfs?: readonly ElseIfBranch[];
  else?: readonly Statement[];
}): If {
  if (!input.condition) {
    throw new AbapAstError('If: required field "condition" is missing');
  }
  if (!input.thenBody) {
    throw new AbapAstError('If: required field "thenBody" is missing');
  }
  return Object.freeze({
    kind: 'If' as const,
    condition: input.condition,
    thenBody: Object.freeze([...input.thenBody]),
    elseIfs: Object.freeze(
      (input.elseIfs ?? []).map((b) =>
        Object.freeze({ ...b, body: Object.freeze([...b.body]) }),
      ),
    ),
    else: input.else ? Object.freeze([...input.else]) : undefined,
  });
}

/** LOOP AT ... INTO wa / ASSIGNING <fs>. */
export interface Loop extends AbapNode {
  readonly kind: 'Loop';
  readonly table: Expression;
  readonly binding:
    | { readonly bindKind: 'into'; readonly target: Identifier }
    | { readonly bindKind: 'assigning'; readonly fieldSymbol: Identifier };
  readonly body: readonly Statement[];
}

export function loop(input: {
  table: Expression;
  binding: Loop['binding'];
  body: readonly Statement[];
}): Loop {
  if (!input.table) {
    throw new AbapAstError('Loop: required field "table" is missing');
  }
  if (!input.binding) {
    throw new AbapAstError('Loop: required field "binding" is missing');
  }
  if (input.binding.bindKind === 'assigning') {
    const fs = input.binding.fieldSymbol;
    if (!fs.startsWith('<') || !fs.endsWith('>')) {
      throw new AbapAstError(
        `Loop: assigning target "${fs}" must be a field symbol wrapped in angle brackets`,
      );
    }
  }
  if (!input.body) {
    throw new AbapAstError('Loop: required field "body" is missing');
  }
  return Object.freeze({
    kind: 'Loop' as const,
    table: input.table,
    binding: Object.freeze({ ...input.binding }),
    body: Object.freeze([...input.body]),
  });
}

/**
 * `RETURN.` statement, optionally preceded by an assignment to the
 * RETURNING parameter (e.g. `rv_result = <expr>.` + `RETURN.`).
 *
 * `target` is the ABAP identifier of the RETURNING parameter. When
 * `value` is set, `target` is required — ABAP has no implicit `rv`
 * variable.
 */
export interface Return extends AbapNode {
  readonly kind: 'Return';
  readonly value?: Expression;
  readonly target?: string;
}

export function returnStmt(input?: {
  value?: Expression;
  target?: string;
}): Return {
  if (input?.value !== undefined && !input.target) {
    throw new AbapAstError(
      'returnStmt: `target` (the RETURNING parameter name) is required when `value` is set — ABAP has no implicit `rv` variable',
    );
  }
  return Object.freeze({
    kind: 'Return' as const,
    value: input?.value,
    target: input?.target,
  });
}

/** CATCH clause inside a TRY. */
export interface CatchClause {
  readonly exceptionTypes: readonly TypeRef[];
  readonly into?: Identifier;
  readonly body: readonly Statement[];
}

/** TRY / CATCH / CLEANUP. */
export interface Try extends AbapNode {
  readonly kind: 'Try';
  readonly body: readonly Statement[];
  readonly catches: readonly CatchClause[];
  readonly cleanup?: readonly Statement[];
}

export function tryStmt(input: {
  body: readonly Statement[];
  catches: readonly CatchClause[];
  cleanup?: readonly Statement[];
}): Try {
  if (!input.body) {
    throw new AbapAstError('Try: required field "body" is missing');
  }
  if (!input.catches || input.catches.length === 0) {
    throw new AbapAstError('Try: must declare at least one CATCH clause');
  }
  for (const c of input.catches) {
    if (!c.exceptionTypes || c.exceptionTypes.length === 0) {
      throw new AbapAstError(
        'Try: CATCH clause must declare at least one exception type',
      );
    }
  }
  return Object.freeze({
    kind: 'Try' as const,
    body: Object.freeze([...input.body]),
    catches: Object.freeze(
      input.catches.map((c) =>
        Object.freeze({
          ...c,
          exceptionTypes: Object.freeze([...c.exceptionTypes]),
          body: Object.freeze([...c.body]),
        }),
      ),
    ),
    cleanup: input.cleanup ? Object.freeze([...input.cleanup]) : undefined,
  });
}

/** APPEND value TO table. */
export interface Append extends AbapNode {
  readonly kind: 'Append';
  readonly value: Expression;
  readonly table: Expression;
}

export function append(input: {
  value: Expression;
  table: Expression;
}): Append {
  if (!input.value) {
    throw new AbapAstError('Append: required field "value" is missing');
  }
  if (!input.table) {
    throw new AbapAstError('Append: required field "table" is missing');
  }
  return Object.freeze({
    kind: 'Append' as const,
    value: input.value,
    table: input.table,
  });
}

/** INSERT value INTO TABLE table. */
export interface Insert extends AbapNode {
  readonly kind: 'Insert';
  readonly value: Expression;
  readonly table: Expression;
}

export function insert(input: {
  value: Expression;
  table: Expression;
}): Insert {
  if (!input.value) {
    throw new AbapAstError('Insert: required field "value" is missing');
  }
  if (!input.table) {
    throw new AbapAstError('Insert: required field "table" is missing');
  }
  return Object.freeze({
    kind: 'Insert' as const,
    value: input.value,
    table: input.table,
  });
}

/** READ TABLE table INTO wa / ASSIGNING <fs> [WITH KEY ...]. */
export interface Read extends AbapNode {
  readonly kind: 'Read';
  readonly table: Expression;
  readonly binding:
    | { readonly bindKind: 'into'; readonly target: Identifier }
    | { readonly bindKind: 'assigning'; readonly fieldSymbol: Identifier };
  readonly withKey?: readonly NamedArg[];
  readonly index?: Expression;
}

export function read(input: {
  table: Expression;
  binding: Read['binding'];
  withKey?: readonly NamedArg[];
  index?: Expression;
}): Read {
  if (!input.table) {
    throw new AbapAstError('Read: required field "table" is missing');
  }
  if (!input.binding) {
    throw new AbapAstError('Read: required field "binding" is missing');
  }
  return Object.freeze({
    kind: 'Read' as const,
    table: input.table,
    binding: Object.freeze({ ...input.binding }),
    withKey: input.withKey
      ? Object.freeze(input.withKey.map((a) => Object.freeze({ ...a })))
      : undefined,
    index: input.index,
  });
}

/** CLEAR target. */
export interface Clear extends AbapNode {
  readonly kind: 'Clear';
  readonly target: Expression;
}

export function clear(input: { target: Expression }): Clear {
  if (!input.target) {
    throw new AbapAstError('Clear: required field "target" is missing');
  }
  return Object.freeze({ kind: 'Clear' as const, target: input.target });
}

/** EXIT. */
export interface Exit extends AbapNode {
  readonly kind: 'Exit';
}

export function exit(): Exit {
  return Object.freeze({ kind: 'Exit' as const });
}

/** CONTINUE. */
export interface Continue extends AbapNode {
  readonly kind: 'Continue';
}

export function continueStmt(): Continue {
  return Object.freeze({ kind: 'Continue' as const });
}

/** Verbatim ABAP source — escape hatch when the AST can't express something. */
export interface Raw extends AbapNode {
  readonly kind: 'Raw';
  readonly source: string;
}

export function raw(input: { source: string }): Raw {
  if (typeof input.source !== 'string' || input.source.length === 0) {
    throw new AbapAstError('Raw: required field "source" is missing');
  }
  return Object.freeze({ kind: 'Raw' as const, source: input.source });
}
