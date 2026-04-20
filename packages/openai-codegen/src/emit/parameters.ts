import {
  builtinType,
  methodParam,
  type MethodParam,
  type TypeRef,
  type BuiltinType,
} from '@abapify/abap-ast';
import type {
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
} from '../oas/types';
import type { TypePlan } from '../types/plan';
import { mapSchemaToTypeRef } from '../types/map';
import { makeNameAllocator, type NameAllocator } from '../types/naming';
import { paramNameFor } from './identifiers';

export interface ParamTranslation {
  readonly param: MethodParam;
  readonly source: NormalizedParameter;
  readonly abapName: string;
}

/** Per-method allocator keeps param names unique within a signature. */
export function makeMethodParamAllocator(): NameAllocator {
  return makeNameAllocator(new Set<string>());
}

/** Translate a NormalizedParameter to an ABAP METHODS importing param. */
export function translateParameter(
  p: NormalizedParameter,
  plan: TypePlan,
  allocator: NameAllocator,
): ParamTranslation {
  const abapName = paramNameFor(p, allocator);
  const typeRef: TypeRef = mapSchemaToTypeRef(p.schema, plan);
  const param = methodParam({
    paramKind: 'importing',
    name: abapName,
    typeRef,
    optional: !p.required,
  });
  return { param, source: p, abapName };
}

/** Translate a request body to a single `is_body` importing parameter. */
export function translateRequestBody(
  rb: NormalizedRequestBody,
  plan: TypePlan,
  allocator: NameAllocator,
): { param: MethodParam; abapName: string; mediaType: string } | undefined {
  const mediaType = pickRequestMediaType(rb);
  if (!mediaType) return undefined;
  const schema = rb.content[mediaType]!.schema;
  const abapName = allocator('body', 'param', { prefix: 'is_' });
  const fmt = (schema as { format?: unknown }).format;
  const typeRef: TypeRef =
    fmt === 'binary' || fmt === 'byte'
      ? (builtinType({ name: 'xstring' }) as BuiltinType)
      : mapSchemaToTypeRef(schema, plan);
  const param = methodParam({
    paramKind: 'importing',
    name: abapName,
    typeRef,
    optional: rb.required === false,
  });
  return { param, abapName, mediaType };
}

/** Prefer application/json (or +json); fall back to octet-stream / binary; else first available. */
export function pickRequestMediaType(
  rb: NormalizedRequestBody,
): string | undefined {
  const keys = Object.keys(rb.content);
  if (keys.length === 0) return undefined;
  const json = keys.find(
    (k) => k === 'application/json' || k.endsWith('+json'),
  );
  if (json) return json;
  const bin = keys.find(
    (k) => k === 'application/octet-stream' || k.endsWith('binary'),
  );
  if (bin) return bin;
  return keys[0];
}

/** Build all importing params for an operation (path + query + header + body). */
export function buildImportingParams(
  op: NormalizedOperation,
  plan: TypePlan,
): {
  params: ParamTranslation[];
  body?: { param: MethodParam; abapName: string; mediaType: string };
} {
  const allocator = makeMethodParamAllocator();
  const params: ParamTranslation[] = [];
  for (const p of op.parameters) {
    if (p.in === 'cookie') continue;
    params.push(translateParameter(p, plan, allocator));
  }
  const body = op.requestBody
    ? translateRequestBody(op.requestBody, plan, allocator)
    : undefined;
  return { params, body };
}
