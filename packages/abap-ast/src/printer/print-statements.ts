import type { Writer } from './writer';
import type { Statement } from '../nodes/statements';
import type { DataDecl, FieldSymbolDecl } from '../nodes/data';
import type { Comment } from '../nodes/base';
import { printExpression, printArgs } from './print-expressions';
import { printInlineType } from './print-types';

export function printStatements(
  stmts: readonly Statement[],
  writer: Writer,
): void {
  for (const s of stmts) {
    printStatement(s, writer);
  }
}

export function printStatement(stmt: Statement, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  switch (stmt.kind) {
    case 'Comment':
      printComment(stmt, writer);
      return;
    case 'DataDecl':
      printDataDecl(stmt, writer);
      return;
    case 'FieldSymbolDecl':
      printFieldSymbolDecl(stmt, writer);
      return;
    case 'Assign': {
      const target = printExpression(stmt.target, writer);
      const value = printExpression(stmt.value, writer);
      writer.writeLine(`${target} = ${value}.`);
      return;
    }
    case 'Call': {
      const col = writer.prefix().length;
      if (stmt.callKind === 'static') {
        const recv =
          stmt.receiver !== undefined
            ? printExpression(stmt.receiver, writer)
            : '';
        const head = recv.length > 0 ? `${recv}=>${stmt.method}` : stmt.method;
        const args = printArgs(stmt.args, writer, col + head.length + 1);
        writer.writeLine(`${head}(${args}).`);
      } else {
        if (stmt.receiver === undefined) {
          throw new Error('Call: instance call has no receiver');
        }
        const recv = printExpression(stmt.receiver, writer);
        const head = `${recv}->${stmt.method}`;
        const args = printArgs(stmt.args, writer, col + head.length + 1);
        writer.writeLine(`${head}(${args}).`);
      }
      return;
    }
    case 'Raise': {
      const col = writer.prefix().length;
      const type = printInlineType(stmt.exceptionType, writer);
      const head = `${K('RAISE EXCEPTION')} ${K('NEW')} ${type}`;
      const args = printArgs(stmt.args, writer, col + head.length + 1);
      writer.writeLine(`${head}(${args}).`);
      return;
    }
    case 'If': {
      writer.writeLine(
        `${K('IF')} ${printExpression(stmt.condition, writer)}.`,
      );
      writer.indent();
      printStatements(stmt.thenBody, writer);
      writer.dedent();
      for (const b of stmt.elseIfs) {
        writer.writeLine(
          `${K('ELSEIF')} ${printExpression(b.condition, writer)}.`,
        );
        writer.indent();
        printStatements(b.body, writer);
        writer.dedent();
      }
      if (stmt.else) {
        writer.writeLine(`${K('ELSE')}.`);
        writer.indent();
        printStatements(stmt.else, writer);
        writer.dedent();
      }
      writer.writeLine(`${K('ENDIF')}.`);
      return;
    }
    case 'Loop': {
      const table = printExpression(stmt.table, writer);
      const bind =
        stmt.binding.bindKind === 'into'
          ? `${K('INTO')} ${stmt.binding.target}`
          : `${K('ASSIGNING')} ${stmt.binding.fieldSymbol}`;
      writer.writeLine(`${K('LOOP AT')} ${table} ${bind}.`);
      writer.indent();
      printStatements(stmt.body, writer);
      writer.dedent();
      writer.writeLine(`${K('ENDLOOP')}.`);
      return;
    }
    case 'Return': {
      if (stmt.value !== undefined) {
        writer.writeLine(
          `${stmt.target} = ${printExpression(stmt.value, writer)}.`,
        );
      }
      writer.writeLine(`${K('RETURN')}.`);
      return;
    }
    case 'Try': {
      writer.writeLine(`${K('TRY')}.`);
      writer.indent();
      printStatements(stmt.body, writer);
      writer.dedent();
      for (const c of stmt.catches) {
        const types = c.exceptionTypes
          .map((t) => printInlineType(t, writer))
          .join(' ');
        const into = c.into ? ` ${K('INTO')} ${c.into}` : '';
        writer.writeLine(`${K('CATCH')} ${types}${into}.`);
        writer.indent();
        printStatements(c.body, writer);
        writer.dedent();
      }
      if (stmt.cleanup) {
        writer.writeLine(`${K('CLEANUP')}.`);
        writer.indent();
        printStatements(stmt.cleanup, writer);
        writer.dedent();
      }
      writer.writeLine(`${K('ENDTRY')}.`);
      return;
    }
    case 'Append': {
      const v = printExpression(stmt.value, writer);
      const t = printExpression(stmt.table, writer);
      writer.writeLine(`${K('APPEND')} ${v} ${K('TO')} ${t}.`);
      return;
    }
    case 'Insert': {
      const v = printExpression(stmt.value, writer);
      const t = printExpression(stmt.table, writer);
      writer.writeLine(`${K('INSERT')} ${v} ${K('INTO TABLE')} ${t}.`);
      return;
    }
    case 'Read': {
      const t = printExpression(stmt.table, writer);
      const bind =
        stmt.binding.bindKind === 'into'
          ? `${K('INTO')} ${stmt.binding.target}`
          : `${K('ASSIGNING')} ${stmt.binding.fieldSymbol}`;
      const parts: string[] = [`${K('READ TABLE')} ${t}`];
      if (stmt.index !== undefined) {
        parts.push(`${K('INDEX')} ${printExpression(stmt.index, writer)}`);
      }
      parts.push(bind);
      if (stmt.withKey && stmt.withKey.length > 0) {
        const kv = stmt.withKey
          .map((a) => `${a.name} = ${printExpression(a.value, writer)}`)
          .join(' ');
        parts.push(`${K('WITH KEY')} ${kv}`);
      }
      writer.writeLine(parts.join(' ') + '.');
      return;
    }
    case 'Clear': {
      writer.writeLine(
        `${K('CLEAR')} ${printExpression(stmt.target, writer)}.`,
      );
      return;
    }
    case 'Exit':
      writer.writeLine(`${K('EXIT')}.`);
      return;
    case 'Continue':
      writer.writeLine(`${K('CONTINUE')}.`);
      return;
    case 'Raw': {
      const lines = stmt.source.split(/\r?\n/);
      for (const line of lines) {
        writer.writeLine(line);
      }
      return;
    }
  }
}

export function printComment(node: Comment, writer: Writer): void {
  if (node.style === 'star') {
    // Star comments begin at column 1.
    const lines = node.text.split(/\r?\n/);
    for (const line of lines) {
      // Push raw line — bypass indent prefix.
      writer.rawLine(`* ${line}`);
    }
  } else {
    const lines = node.text.split(/\r?\n/);
    for (const line of lines) {
      writer.writeLine(`" ${line}`);
    }
  }
}

export function printDataDecl(node: DataDecl, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  const kw = node.classData ? K('CLASS-DATA') : K('DATA');
  const type = printInlineType(node.type, writer);
  let line = `${kw} ${node.name} ${K('TYPE')} ${type}`;
  if (node.initial !== undefined) {
    line += ` ${K('VALUE')} ${printExpression(node.initial, writer)}`;
  }
  writer.writeLine(`${line}.`);
}

export function printFieldSymbolDecl(
  node: FieldSymbolDecl,
  writer: Writer,
): void {
  const K = (s: string): string => writer.kw(s);
  const type = printInlineType(node.type, writer);
  writer.writeLine(`${K('FIELD-SYMBOLS')} ${node.name} ${K('TYPE')} ${type}.`);
}
