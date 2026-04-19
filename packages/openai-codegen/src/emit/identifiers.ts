import { sanitizeIdent, type NameAllocator } from '../types/naming';
import type { NormalizedOperation, NormalizedParameter } from '../oas/types';

/** Derive a stable ABAP method name for an operation via an allocator. */
export function methodNameFor(
  op: NormalizedOperation,
  allocator: NameAllocator,
): string {
  const raw = op.operationId || `${op.method}_${op.path}`;
  return allocator(raw, 'method');
}

/** Derive a stable ABAP parameter name for an operation parameter. */
export function paramNameFor(
  p: NormalizedParameter,
  allocator: NameAllocator,
): string {
  return allocator(p.name, 'param', { prefix: 'iv_' });
}

/** Deterministic exception class name for a given client class. */
export function exceptionClassNameFor(className: string): string {
  const upper = className.toUpperCase();
  const tail = upper.startsWith('ZCL_') ? upper.slice(4) : upper;
  return sanitizeIdent(`ZCX_${tail}_ERROR`, 'class', { maxLen: 30 });
}

/** Derive a stable ABAP attribute name from a logical key. */
export function attributeNameFor(logical: string): string {
  return sanitizeIdent(logical, 'param', { prefix: 'mv_' });
}
