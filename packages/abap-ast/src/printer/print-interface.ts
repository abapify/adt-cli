import type { Writer } from './writer';
import type { InterfaceDef } from '../nodes/interface';
import { printTypeDef } from './print-types';
import { printMethodDef } from './print-members';

export function printInterfaceDef(node: InterfaceDef, writer: Writer): void {
  const K = (s: string): string => writer.kw(s);
  writer.writeLine(`${K('INTERFACE')} ${node.name} ${K('PUBLIC')}.`);
  writer.indent();
  for (const m of node.members) {
    switch (m.kind) {
      case 'TypeDef':
        printTypeDef(m, writer);
        break;
      case 'MethodDef':
        printMethodDef(m, writer);
        break;
    }
  }
  writer.dedent();
  writer.writeLine(`${K('ENDINTERFACE')}.`);
}
