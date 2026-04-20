import type { AbapDoc, AbapNode, Identifier, Visibility } from './base';
import { AbapAstError } from './errors';
import type { TypeDef } from './types';
import type { ConstantDecl } from './data';
import type { AttributeDef, EventDef, MethodDef, MethodImpl } from './members';

/** A member that may appear inside a class section. */
export type SectionMember =
  | TypeDef
  | AttributeDef
  | MethodDef
  | ConstantDecl
  | EventDef;

/** A visibility section of a class definition. */
export interface Section extends AbapNode {
  readonly kind: 'Section';
  readonly visibility: Visibility;
  readonly members: readonly SectionMember[];
}

export function section(input: {
  visibility: Visibility;
  members?: readonly SectionMember[];
}): Section {
  if (!input.visibility) {
    throw new AbapAstError('Section: required field "visibility" is missing');
  }
  const members = input.members ?? [];
  for (const m of members) {
    if ('visibility' in m && m.visibility !== input.visibility) {
      throw new AbapAstError(
        `Section: member "${m.name}" has visibility "${m.visibility}" but section is "${input.visibility}"`,
      );
    }
  }
  return Object.freeze({
    kind: 'Section' as const,
    visibility: input.visibility,
    members: Object.freeze([...members]),
  });
}

/** Top-level global class (`CLASS ... DEFINITION` + `IMPLEMENTATION`). */
export interface ClassDef extends AbapNode {
  readonly kind: 'ClassDef';
  readonly name: Identifier;
  readonly superclass?: Identifier;
  readonly interfaces: readonly Identifier[];
  readonly isFinal?: boolean;
  readonly isAbstract?: boolean;
  readonly isForTesting?: boolean;
  readonly isCreatePrivate?: boolean;
  readonly sections: readonly Section[];
  readonly implementations: readonly MethodImpl[];
}

export function classDef(input: {
  name: Identifier;
  superclass?: Identifier;
  interfaces?: readonly Identifier[];
  isFinal?: boolean;
  isAbstract?: boolean;
  isForTesting?: boolean;
  isCreatePrivate?: boolean;
  sections?: readonly Section[];
  implementations?: readonly MethodImpl[];
  abapDoc?: AbapDoc;
}): ClassDef {
  if (!input.name) {
    throw new AbapAstError('ClassDef: required field "name" is missing');
  }
  if (input.isFinal && input.isAbstract) {
    throw new AbapAstError('ClassDef: class cannot be both FINAL and ABSTRACT');
  }
  return Object.freeze({
    kind: 'ClassDef' as const,
    name: input.name,
    superclass: input.superclass,
    interfaces: Object.freeze([...(input.interfaces ?? [])]),
    isFinal: input.isFinal,
    isAbstract: input.isAbstract,
    isForTesting: input.isForTesting,
    isCreatePrivate: input.isCreatePrivate,
    sections: Object.freeze([...(input.sections ?? [])]),
    implementations: Object.freeze([...(input.implementations ?? [])]),
    abapDoc: input.abapDoc ? Object.freeze([...input.abapDoc]) : undefined,
  });
}

/** A local class inside a CLAS-POOL (same shape as ClassDef, flagged local). */
export interface LocalClassDef extends AbapNode {
  readonly kind: 'LocalClassDef';
  readonly name: Identifier;
  readonly superclass?: Identifier;
  readonly interfaces: readonly Identifier[];
  readonly isFinal?: boolean;
  readonly isAbstract?: boolean;
  readonly isForTesting?: boolean;
  readonly sections: readonly Section[];
  readonly implementations: readonly MethodImpl[];
  readonly local: true;
}

export function localClassDef(input: {
  name: Identifier;
  superclass?: Identifier;
  interfaces?: readonly Identifier[];
  isFinal?: boolean;
  isAbstract?: boolean;
  isForTesting?: boolean;
  sections?: readonly Section[];
  implementations?: readonly MethodImpl[];
}): LocalClassDef {
  if (!input.name) {
    throw new AbapAstError('LocalClassDef: required field "name" is missing');
  }
  if (input.isFinal && input.isAbstract) {
    throw new AbapAstError(
      'LocalClassDef: class cannot be both FINAL and ABSTRACT',
    );
  }
  return Object.freeze({
    kind: 'LocalClassDef' as const,
    name: input.name,
    superclass: input.superclass,
    interfaces: Object.freeze([...(input.interfaces ?? [])]),
    isFinal: input.isFinal,
    isAbstract: input.isAbstract,
    isForTesting: input.isForTesting,
    sections: Object.freeze([...(input.sections ?? [])]),
    implementations: Object.freeze([...(input.implementations ?? [])]),
    local: true as const,
  });
}
