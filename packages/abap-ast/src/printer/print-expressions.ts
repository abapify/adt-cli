import type { Writer } from './writer';
import type {
  Expression,
  NamedArg,
  StringTemplate,
} from '../nodes/expressions';
import { printInlineType } from './print-types';

/** Print an expression to a single string (no newlines unless forced by wrapping). */
export function printExpression(expr: Expression, writer: Writer): string {
  switch (expr.kind) {
    case 'Literal':
      return printLiteral(expr.literalKind, expr.value);
    case 'IdentifierExpr':
      return expr.name;
    case 'ConstructorExpr': {
      const type = printInlineType(expr.type, writer);
      const args = printArgs(expr.args, writer, 0);
      return `${writer.kw('NEW')} ${type}(${args})`;
    }
    case 'MethodCallExpr': {
      const args = printArgs(expr.args, writer, 0);
      if (expr.callKind === 'static') {
        const recv =
          expr.receiver !== undefined
            ? printExpression(expr.receiver, writer)
            : '';
        const head = recv.length > 0 ? `${recv}=>${expr.method}` : expr.method;
        return `${head}(${args})`;
      }
      if (expr.receiver === undefined) {
        throw new Error('MethodCallExpr: instance call has no receiver');
      }
      const recv = printExpression(expr.receiver, writer);
      return `${recv}->${expr.method}(${args})`;
    }
    case 'BinOp': {
      // Preserve operator grouping — wrap nested BinOp operands in parens
      // so that `a AND (b OR c)` does not flatten to `a AND b OR c` and
      // change the ABAP condition semantics.
      const wrap = (inner: Expression): string => {
        const src = printExpression(inner, writer);
        return inner.kind === 'BinOp' ? `( ${src} )` : src;
      };
      const left = wrap(expr.left);
      const right = wrap(expr.right);
      const op =
        expr.op === 'AND' || expr.op === 'OR' ? writer.kw(expr.op) : expr.op;
      return `${left} ${op} ${right}`;
    }
    case 'StringTemplate':
      return printStringTemplate(expr, writer);
    case 'Cast': {
      const type = printInlineType(expr.type, writer);
      const inner = printExpression(expr.expr, writer);
      return `${writer.kw('CAST')} ${type}( ${inner} )`;
    }
  }
}

function printLiteral(
  kind: 'string' | 'int' | 'bool' | 'hex',
  value: string | number | boolean,
): string {
  switch (kind) {
    case 'string':
      return `'${String(value).replaceAll("'", `''`)}'`;
    case 'int':
      return String(value);
    case 'bool':
      return (value as boolean) ? 'abap_true' : 'abap_false';
    case 'hex':
      return `'${String(value)}'`;
  }
}

/** Print the inside of `( ... )` for a named-arg list. Empty → ' ' (ABAP convention). */
export function printArgs(
  args: readonly NamedArg[],
  writer: Writer,
  currentColumn: number,
): string {
  if (args.length === 0) {
    return ' ';
  }
  const single = args
    .map((a) => `${a.name} = ${printExpression(a.value, writer)}`)
    .join(' ');
  const singleLine = ` ${single} `;
  // Heuristic: wrap when total column would exceed 80.
  if (currentColumn + singleLine.length + 2 <= 80) {
    return singleLine;
  }
  const eol = writer.options.eol;
  const pad = ' '.repeat(currentColumn + writer.options.indent);
  const parts = args.map(
    (a) => `${pad}${a.name} = ${printExpression(a.value, writer)}`,
  );
  return eol + parts.join(eol) + eol + ' '.repeat(currentColumn);
}

function printStringTemplate(node: StringTemplate, writer: Writer): string {
  let out = '|';
  for (const part of node.parts) {
    if (part.partKind === 'text') {
      out += part.text;
    } else {
      out += `{ ${printExpression(part.expr, writer)} }`;
    }
  }
  out += '|';
  return out;
}
