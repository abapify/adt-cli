import type { AbapDoc, AbapNode, Identifier, Visibility } from './base';
import { AbapAstError } from './errors';
import type { TypeRef } from './types';
import type { Expression } from './expressions';
import type { Statement } from './statements';

/** ABAP method parameter kind. */
export type ParamKind = 'importing' | 'exporting' | 'changing' | 'returning';

export interface MethodParam extends AbapNode {
  readonly kind: 'MethodParam';
  readonly paramKind: ParamKind;
  readonly name: Identifier;
  readonly typeRef: TypeRef;
  readonly optional?: boolean;
  readonly default?: Expression;
}

export function methodParam(input: {
  paramKind: ParamKind;
  name: Identifier;
  typeRef: TypeRef;
  optional?: boolean;
  default?: Expression;
}): MethodParam {
  if (!input.paramKind) {
    throw new AbapAstError(
      'MethodParam: required field "paramKind" is missing',
    );
  }
  if (!input.name) {
    throw new AbapAstError('MethodParam: required field "name" is missing');
  }
  if (!input.typeRef) {
    throw new AbapAstError('MethodParam: required field "typeRef" is missing');
  }
  if (input.paramKind === 'returning' && input.optional) {
    throw new AbapAstError(
      'MethodParam: RETURNING parameters cannot be optional',
    );
  }
  if (input.paramKind === 'returning' && input.default !== undefined) {
    throw new AbapAstError(
      'MethodParam: RETURNING parameters cannot have a default',
    );
  }
  return Object.freeze({
    kind: 'MethodParam' as const,
    paramKind: input.paramKind,
    name: input.name,
    typeRef: input.typeRef,
    optional: input.optional,
    default: input.default,
  });
}

export interface MethodDef extends AbapNode {
  readonly kind: 'MethodDef';
  readonly name: Identifier;
  readonly params: readonly MethodParam[];
  readonly raising: readonly TypeRef[];
  readonly visibility: Visibility;
  readonly isClassMethod?: boolean;
  readonly isAbstract?: boolean;
  readonly isFinal?: boolean;
  readonly isRedefinition?: boolean;
  readonly isForTesting?: boolean;
}

export function methodDef(input: {
  name: Identifier;
  params?: readonly MethodParam[];
  raising?: readonly TypeRef[];
  visibility: Visibility;
  isClassMethod?: boolean;
  isAbstract?: boolean;
  isFinal?: boolean;
  isRedefinition?: boolean;
  isForTesting?: boolean;
  abapDoc?: AbapDoc;
}): MethodDef {
  if (!input.name) {
    throw new AbapAstError('MethodDef: required field "name" is missing');
  }
  if (!input.visibility) {
    throw new AbapAstError('MethodDef: required field "visibility" is missing');
  }
  const params = input.params ?? [];
  // Validate: at most one RETURNING, and if present no EXPORTING/CHANGING.
  const returning = params.filter((p) => p.paramKind === 'returning');
  if (returning.length > 1) {
    throw new AbapAstError(
      'MethodDef: a method can have at most one RETURNING parameter',
    );
  }
  if (returning.length === 1) {
    const hasExportingOrChanging = params.some(
      (p) => p.paramKind === 'exporting' || p.paramKind === 'changing',
    );
    if (hasExportingOrChanging) {
      throw new AbapAstError(
        'MethodDef: RETURNING parameter cannot be combined with EXPORTING or CHANGING',
      );
    }
  }
  return Object.freeze({
    kind: 'MethodDef' as const,
    name: input.name,
    params: Object.freeze([...params]),
    raising: Object.freeze([...(input.raising ?? [])]),
    visibility: input.visibility,
    isClassMethod: input.isClassMethod,
    isAbstract: input.isAbstract,
    isFinal: input.isFinal,
    isRedefinition: input.isRedefinition,
    isForTesting: input.isForTesting,
    abapDoc: input.abapDoc ? Object.freeze([...input.abapDoc]) : undefined,
  });
}

/** Body of a method in the IMPLEMENTATION block. */
export interface MethodImpl extends AbapNode {
  readonly kind: 'MethodImpl';
  readonly name: Identifier;
  readonly body: readonly Statement[];
}

export function methodImpl(input: {
  name: Identifier;
  body: readonly Statement[];
}): MethodImpl {
  if (!input.name) {
    throw new AbapAstError('MethodImpl: required field "name" is missing');
  }
  if (!input.body) {
    throw new AbapAstError('MethodImpl: required field "body" is missing');
  }
  return Object.freeze({
    kind: 'MethodImpl' as const,
    name: input.name,
    body: Object.freeze([...input.body]),
  });
}

/** EVENT declaration (stub — body not modelled yet). */
export interface EventDef extends AbapNode {
  readonly kind: 'EventDef';
  readonly name: Identifier;
  readonly visibility: Visibility;
  readonly isClassEvent?: boolean;
}

export function eventDef(input: {
  name: Identifier;
  visibility: Visibility;
  isClassEvent?: boolean;
}): EventDef {
  if (!input.name) {
    throw new AbapAstError('EventDef: required field "name" is missing');
  }
  if (!input.visibility) {
    throw new AbapAstError('EventDef: required field "visibility" is missing');
  }
  return Object.freeze({
    kind: 'EventDef' as const,
    name: input.name,
    visibility: input.visibility,
    isClassEvent: input.isClassEvent,
  });
}

/** DATA / CLASS-DATA declaration inside a class section. */
export interface AttributeDef extends AbapNode {
  readonly kind: 'AttributeDef';
  readonly name: Identifier;
  readonly type: TypeRef;
  readonly visibility: Visibility;
  readonly classData?: boolean;
  readonly readOnly?: boolean;
  readonly initial?: Expression;
}

export function attributeDef(input: {
  name: Identifier;
  type: TypeRef;
  visibility: Visibility;
  classData?: boolean;
  readOnly?: boolean;
  initial?: Expression;
  abapDoc?: AbapDoc;
}): AttributeDef {
  if (!input.name) {
    throw new AbapAstError('AttributeDef: required field "name" is missing');
  }
  if (!input.type) {
    throw new AbapAstError('AttributeDef: required field "type" is missing');
  }
  if (!input.visibility) {
    throw new AbapAstError(
      'AttributeDef: required field "visibility" is missing',
    );
  }
  return Object.freeze({
    kind: 'AttributeDef' as const,
    name: input.name,
    type: input.type,
    visibility: input.visibility,
    classData: input.classData,
    readOnly: input.readOnly,
    initial: input.initial,
    abapDoc: input.abapDoc ? Object.freeze([...input.abapDoc]) : undefined,
  });
}
