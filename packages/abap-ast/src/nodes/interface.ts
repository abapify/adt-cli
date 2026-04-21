import type { AbapDoc, AbapNode, Identifier } from './base';
import { AbapAstError } from './errors';
import type { TypeDef } from './types';
import type { MethodDef } from './members';

/** A member that may appear inside an interface definition. */
export type InterfaceMember = TypeDef | MethodDef;

/** `INTERFACE zif_foo. ... ENDINTERFACE.`. */
export interface InterfaceDef extends AbapNode {
  readonly kind: 'InterfaceDef';
  readonly name: Identifier;
  readonly members: readonly InterfaceMember[];
}

export function interfaceDef(input: {
  name: Identifier;
  members?: readonly InterfaceMember[];
  abapDoc?: AbapDoc;
}): InterfaceDef {
  if (!input.name) {
    throw new AbapAstError('InterfaceDef: required field "name" is missing');
  }
  const members = input.members ?? [];
  for (const m of members) {
    if (m.kind === 'MethodDef' && m.visibility !== 'public') {
      throw new AbapAstError(
        `InterfaceDef: method "${m.name}" must be public (interfaces expose only public methods)`,
      );
    }
  }
  return Object.freeze({
    kind: 'InterfaceDef' as const,
    name: input.name,
    members: Object.freeze([...members]),
    abapDoc: input.abapDoc ? Object.freeze([...input.abapDoc]) : undefined,
  });
}
