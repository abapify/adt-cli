import type { Writer } from './writer';
import type {
  AttributeDef,
  EventDef,
  MethodDef,
  MethodImpl,
  MethodParam,
} from '../nodes/members';
import type { ConstantDecl } from '../nodes/data';
import { printInlineType } from './print-types';
import { printExpression } from './print-expressions';
import { printStatements } from './print-statements';

export function printAttributeDef(node: AttributeDef, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  const kw = node.classData ? K('CLASS-DATA') : K('DATA');
  const type = printInlineType(node.type, writer);
  let line = `${kw} ${node.name} ${K('TYPE')} ${type}`;
  if (node.readOnly) {
    line += ` ${K('READ-ONLY')}`;
  }
  if (node.initial !== undefined) {
    line += ` ${K('VALUE')} ${printExpression(node.initial, writer)}`;
  }
  writer.writeLine(`${line}.`);
}

export function printConstantDecl(node: ConstantDecl, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  const kw = node.classData ? K('CLASS-CONSTANTS') : K('CONSTANTS');
  const type = printInlineType(node.type, writer);
  writer.writeLine(
    `${kw} ${node.name} ${K('TYPE')} ${type} ${K('VALUE')} ${printExpression(node.value, writer)}.`,
  );
}

export function printEventDef(node: EventDef, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  const kw = node.isClassEvent ? K('CLASS-EVENTS') : K('EVENTS');
  writer.writeLine(`${kw} ${node.name}.`);
}

const PARAM_KW: Record<MethodParam['paramKind'], string> = {
  importing: 'IMPORTING',
  exporting: 'EXPORTING',
  changing: 'CHANGING',
  returning: 'RETURNING',
};

/** Group params by kind (preserving AST order within each group). */
function groupParams(
  params: readonly MethodParam[],
): ReadonlyArray<{ kind: MethodParam['paramKind']; items: MethodParam[] }> {
  const order: MethodParam['paramKind'][] = [
    'importing',
    'exporting',
    'changing',
    'returning',
  ];
  const result: { kind: MethodParam['paramKind']; items: MethodParam[] }[] = [];
  for (const k of order) {
    const items = params.filter((p) => p.paramKind === k);
    if (items.length > 0) {
      result.push({ kind: k, items });
    }
  }
  return result;
}

function printParamBody(p: MethodParam, writer: Writer): string {
  const K = (s: string): string => writer.kw(s);
  const type = printInlineType(p.typeRef, writer);
  let body: string;
  if (p.paramKind === 'returning') {
    body = `${K('VALUE')}(${p.name}) ${K('TYPE')} ${type}`;
  } else {
    body = `${p.name} ${K('TYPE')} ${type}`;
  }
  if (p.optional) {
    body += ` ${K('OPTIONAL')}`;
  }
  if (p.default !== undefined) {
    body += ` ${K('DEFAULT')} ${printExpression(p.default, writer)}`;
  }
  return body;
}

export function printMethodDef(node: MethodDef, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  const flagsPrefix = node.isClassMethod ? K('CLASS-METHODS') : K('METHODS');
  const suffixFlags: string[] = [];
  if (node.isAbstract) suffixFlags.push(K('ABSTRACT'));
  if (node.isFinal) suffixFlags.push(K('FINAL'));
  if (node.isRedefinition) suffixFlags.push(K('REDEFINITION'));
  if (node.isForTesting) suffixFlags.push(K('FOR TESTING'));

  const groups = groupParams(node.params);
  const hasAny = groups.length > 0 || node.raising.length > 0;

  if (!hasAny && suffixFlags.length === 0) {
    writer.writeLine(`${flagsPrefix} ${node.name}.`);
    return;
  }

  if (!hasAny) {
    writer.writeLine(`${flagsPrefix} ${node.name} ${suffixFlags.join(' ')}.`);
    return;
  }

  // Header line
  writer.writeLine(`${flagsPrefix} ${node.name}`);
  writer.indent();
  // Parameter groups
  for (const g of groups) {
    const kw = K(PARAM_KW[g.kind]);
    if (g.items.length === 1) {
      writer.writeLine(`${kw} ${printParamBody(g.items[0], writer)}`);
    } else {
      writer.writeLine(kw);
      writer.indent();
      g.items.forEach((p) => {
        writer.writeLine(printParamBody(p, writer));
      });
      writer.dedent();
    }
  }
  if (node.raising.length > 0) {
    const types = node.raising.map((t) => printInlineType(t, writer)).join(' ');
    writer.writeLine(`${K('RAISING')} ${types}`);
  }
  if (suffixFlags.length > 0) {
    writer.writeLine(suffixFlags.join(' '));
  }
  writer.dedent();
  // Terminate last emitted line with a period.
  // Find the last non-empty line and add '.'.
  // The writer's toString uses internal lines[]; append '.' via write().
  writer.write('.');
}

export function printMethodImpl(node: MethodImpl, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  writer.writeLine(`${K('METHOD')} ${node.name}.`);
  writer.indent();
  printStatements(node.body, writer);
  writer.dedent();
  writer.writeLine(`${K('ENDMETHOD')}.`);
}
