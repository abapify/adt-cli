import type { AbapNode, Identifier } from './base';
import { AbapAstError } from './errors';
import type { TypeRef } from './types';
import type { Expression } from './expressions';

/** `DATA lv_x TYPE ... [VALUE ...]`. */
export interface DataDecl extends AbapNode {
  readonly kind: 'DataDecl';
  readonly name: Identifier;
  readonly type: TypeRef;
  readonly initial?: Expression;
  readonly classData?: boolean;
}

export function dataDecl(input: {
  name: Identifier;
  type: TypeRef;
  initial?: Expression;
  classData?: boolean;
}): DataDecl {
  if (!input.name) {
    throw new AbapAstError('DataDecl: required field "name" is missing');
  }
  if (!input.type) {
    throw new AbapAstError('DataDecl: required field "type" is missing');
  }
  return Object.freeze({
    kind: 'DataDecl' as const,
    name: input.name,
    type: input.type,
    initial: input.initial,
    classData: input.classData,
  });
}

/** `CONSTANTS c_x TYPE ... VALUE ...`. */
export interface ConstantDecl extends AbapNode {
  readonly kind: 'ConstantDecl';
  readonly name: Identifier;
  readonly type: TypeRef;
  readonly value: Expression;
  readonly classData?: boolean;
}

export function constantDecl(input: {
  name: Identifier;
  type: TypeRef;
  value: Expression;
  classData?: boolean;
}): ConstantDecl {
  if (!input.name) {
    throw new AbapAstError('ConstantDecl: required field "name" is missing');
  }
  if (!input.type) {
    throw new AbapAstError('ConstantDecl: required field "type" is missing');
  }
  if (!input.value) {
    throw new AbapAstError('ConstantDecl: required field "value" is missing');
  }
  return Object.freeze({
    kind: 'ConstantDecl' as const,
    name: input.name,
    type: input.type,
    value: input.value,
    classData: input.classData,
  });
}

/** `FIELD-SYMBOLS <fs_x> TYPE ...`. */
export interface FieldSymbolDecl extends AbapNode {
  readonly kind: 'FieldSymbolDecl';
  readonly name: Identifier;
  readonly type: TypeRef;
}

export function fieldSymbolDecl(input: {
  name: Identifier;
  type: TypeRef;
}): FieldSymbolDecl {
  if (!input.name) {
    throw new AbapAstError('FieldSymbolDecl: required field "name" is missing');
  }
  if (!input.name.startsWith('<') || !input.name.endsWith('>')) {
    throw new AbapAstError(
      `FieldSymbolDecl: name "${input.name}" must be wrapped in angle brackets (e.g. <fs_x>)`,
    );
  }
  if (!input.type) {
    throw new AbapAstError('FieldSymbolDecl: required field "type" is missing');
  }
  return Object.freeze({
    kind: 'FieldSymbolDecl' as const,
    name: input.name,
    type: input.type,
  });
}
