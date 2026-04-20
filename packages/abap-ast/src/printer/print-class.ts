import type { Writer } from './writer';
import type { ClassDef, LocalClassDef, Section } from '../nodes/class';
import type { Visibility } from '../nodes/base';
import { printTypeDef } from './print-types';
import {
  printAttributeDef,
  printConstantDecl,
  printEventDef,
  printMethodDef,
  printMethodImpl,
} from './print-members';

const VIS_KW: Record<Visibility, string> = {
  public: 'PUBLIC SECTION',
  protected: 'PROTECTED SECTION',
  private: 'PRIVATE SECTION',
};

function printSection(sec: Section, writer: Writer): void {
  writer.writeLine(`${writer.kw(VIS_KW[sec.visibility])}.`);
  writer.indent();
  for (const m of sec.members) {
    switch (m.kind) {
      case 'TypeDef':
        printTypeDef(m, writer);
        break;
      case 'AttributeDef':
        printAttributeDef(m, writer);
        break;
      case 'MethodDef':
        printMethodDef(m, writer);
        break;
      case 'ConstantDecl':
        printConstantDecl(m, writer);
        break;
      case 'EventDef':
        printEventDef(m, writer);
        break;
    }
  }
  writer.dedent();
}

function printDefinitionHeader(
  name: string,
  opts: {
    readonly local: boolean;
    readonly superclass?: string;
    readonly interfaces: readonly string[];
    readonly isFinal?: boolean;
    readonly isAbstract?: boolean;
    readonly isForTesting?: boolean;
    readonly isCreatePrivate?: boolean;
  },
  writer: Writer,
): void {
  const K = (s: string): string => writer.kw(s);
  const parts: string[] = [`${K('CLASS')} ${name} ${K('DEFINITION')}`];
  if (!opts.local) {
    parts.push(K('PUBLIC'));
  }
  if (opts.isFinal) parts.push(K('FINAL'));
  if (opts.isAbstract) parts.push(K('ABSTRACT'));
  if (opts.isForTesting) parts.push(K('FOR TESTING'));
  if (opts.superclass) {
    parts.push(`${K('INHERITING FROM')} ${opts.superclass}`);
  }
  if (!opts.local) {
    parts.push(opts.isCreatePrivate ? K('CREATE PRIVATE') : K('CREATE PUBLIC'));
  }
  writer.writeLine(parts.join(' ') + '.');
  if (opts.interfaces.length > 0) {
    writer.indent();
    for (const i of opts.interfaces) {
      writer.writeLine(`${K('INTERFACES')} ${i}.`);
    }
    writer.dedent();
  }
}

function printSections(sections: readonly Section[], writer: Writer): void {
  for (const s of sections) {
    printSection(s, writer);
  }
}

function printImplementations(
  name: string,
  impls: ReadonlyArray<import('../nodes/members').MethodImpl>,
  writer: Writer,
): void {
  const K = (s: string): string => writer.kw(s);
  writer.writeLine(`${K('CLASS')} ${name} ${K('IMPLEMENTATION')}.`);
  writer.indent();
  impls.forEach((impl, idx) => {
    if (idx > 0) writer.blank();
    printMethodImpl(impl, writer);
  });
  writer.dedent();
  writer.writeLine(`${K('ENDCLASS')}.`);
}

export function printClassDef(node: ClassDef, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  printDefinitionHeader(
    node.name,
    {
      local: false,
      superclass: node.superclass,
      interfaces: node.interfaces,
      isFinal: node.isFinal,
      isAbstract: node.isAbstract,
      isForTesting: node.isForTesting,
      isCreatePrivate: node.isCreatePrivate,
    },
    writer,
  );
  writer.indent();
  printSections(node.sections, writer);
  writer.dedent();
  writer.writeLine(`${K('ENDCLASS')}.`);
  writer.blank();
  printImplementations(node.name, node.implementations, writer);
}

export function printLocalClassDef(node: LocalClassDef, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  printDefinitionHeader(
    node.name,
    {
      local: true,
      superclass: node.superclass,
      interfaces: node.interfaces,
      isFinal: node.isFinal,
      isAbstract: node.isAbstract,
      isForTesting: node.isForTesting,
    },
    writer,
  );
  writer.indent();
  printSections(node.sections, writer);
  writer.dedent();
  writer.writeLine(`${K('ENDCLASS')}.`);
  if (node.implementations.length > 0) {
    writer.blank();
    printImplementations(node.name, node.implementations, writer);
  }
}
