/**
 * Layer 2 emitter — OPERATIONS INTERFACE (`ZIF_<base>`).
 *
 * Produces a single global ABAP interface whose methods mirror the OpenAPI
 * `operations` list 1:1. All type references point into the types interface
 * emitted by the Wave 1 Layer-1 emitter (`ZIF_<base>_TYPES`).
 *
 * The design is deliberately conservative:
 *   - RETURNING values carry a bare, natural name (no `rv_` / `rt_` prefix).
 *   - IMPORTING parameters use the OpenAPI parameter name, snake-cased.
 *   - Body parameters are always called `body`.
 *   - Every method RAISES the single generated exception class.
 *   - Cookie parameters are skipped with an `"! @openapi-todo` note.
 *
 * The emitter also returns a parallel `operations` array describing each
 * method's mapping. The Wave 2 implementation-class emitter consumes this
 * array to build per-operation bodies.
 */
import {
  builtinType,
  interfaceDef,
  methodDef,
  methodParam,
  namedTypeRef,
  type InterfaceDef,
  type MethodParam,
  type TypeRef,
} from '@abapify/abap-ast';
import type {
  JsonSchema,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedResponse,
  NormalizedSpec,
} from '../oas/types';
import { isRef } from '../oas/types';
import type { TypePlan } from '../types/plan';
import { mapPrimitive } from '../types/map';
import { makeNameAllocator, sanitizeIdent } from '../types/naming';
// Keep the NamesConfig coupling minimal: we only need the three strings
// passed in via EmitOperationsInterfaceOptions. ResolvedNames is imported
// as type-only for forward compatibility with the Wave 1 naming module.
import type { ResolvedNames } from './naming';

// Silence "unused import" complaints while the naming module is still
// being wired up; ResolvedNames is exported so downstream callers can
// thread it through if they like.
export type { ResolvedNames };

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

export interface EmitOperationsInterfaceOptions {
  /** Global interface name, e.g. 'ZIF_PETSTORE'. */
  readonly name: string;
  /** Name of the sibling types interface, e.g. 'ZIF_PETSTORE_TYPES'. */
  readonly typesInterfaceName: string;
  /** Name of the generated exception class, e.g. 'ZCX_PETSTORE_ERROR'. */
  readonly exceptionClassName: string;
  /** Optional ABAPDoc to attach to the interface itself. */
  readonly interfaceAbapDoc?: readonly string[];
}

export interface OperationParamMapping {
  readonly name: string;
  readonly openapiName: string;
  readonly location: 'path' | 'query' | 'header';
  readonly required: boolean;
  readonly typeRefSource: string;
}

export interface OperationMapping {
  readonly operationId: string;
  readonly methodName: string;
  readonly method: string;
  readonly path: string;
  readonly params: readonly OperationParamMapping[];
  readonly hasBody: boolean;
  readonly successStatus: number | 'default';
  readonly successIsEmptyBody: boolean;
  readonly errorResponses: Readonly<Record<string, { description?: string }>>;
  readonly returningName: string;
}

export interface EmitOperationsInterfaceResult {
  readonly interface: InterfaceDef;
  readonly operations: readonly OperationMapping[];
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function pluckType(schema: JsonSchema | undefined): string | undefined {
  if (!schema) return undefined;
  const t = (schema as { type?: unknown }).type;
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) {
    const nonNull = t.filter((x): x is string => x !== 'null');
    if (nonNull.length >= 1) return nonNull[0];
  }
  return undefined;
}

function isPlainObjectSchema(schema: JsonSchema): boolean {
  const t = pluckType(schema);
  return (
    t === 'object' || isRecord((schema as { properties?: unknown }).properties)
  );
}

function componentNameFromRef(ref: string): string | undefined {
  const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
  return m ? m[1] : undefined;
}

interface ComponentIndex {
  /** Keys of `properties` — sorted, comma-joined — for fast lookup. */
  readonly byPropSig: ReadonlyMap<string, string>;
}

function buildComponentIndex(spec: NormalizedSpec): ComponentIndex {
  const byPropSig = new Map<string, string>();
  for (const [name, schema] of Object.entries(spec.schemas)) {
    if (!isRecord(schema)) continue;
    const props = (schema as { properties?: unknown }).properties;
    if (!isRecord(props)) continue;
    const keys = Object.keys(props).sort().join(',');
    if (keys && !byPropSig.has(keys)) {
      byPropSig.set(keys, name);
    }
  }
  return { byPropSig };
}

/** Identify which component schema a (possibly dereferenced) schema refers to. */
function matchComponent(
  schema: JsonSchema | undefined,
  index: ComponentIndex,
): string | undefined {
  if (!schema) return undefined;
  if (isRef(schema)) return componentNameFromRef(schema.$ref);
  if (!isPlainObjectSchema(schema)) return undefined;
  const props = (schema as { properties?: unknown }).properties;
  if (!isRecord(props)) return undefined;
  const sig = Object.keys(props).sort().join(',');
  if (!sig) return undefined;
  return index.byPropSig.get(sig);
}

function typeInterfaceMember(
  typesInterfaceName: string,
  componentName: string,
): string {
  return `${typesInterfaceName.toLowerCase()}=>${sanitizeIdent(componentName, 'type')}`;
}

/** Render a schema as the printable form used inline after `TYPE`. */
function renderSchemaTypeSource(
  schema: JsonSchema | undefined,
  index: ComponentIndex,
  typesInterfaceName: string,
): string {
  if (!schema) return 'string';
  if (isRef(schema)) {
    const name = componentNameFromRef(schema.$ref);
    return name ? typeInterfaceMember(typesInterfaceName, name) : 'string';
  }
  const t = pluckType(schema);
  if (t === 'array') {
    const items = (schema as { items?: unknown }).items;
    const row = renderSchemaTypeSource(
      isRecord(items) ? (items as JsonSchema) : {},
      index,
      typesInterfaceName,
    );
    // Note: we deliberately omit `WITH EMPTY KEY` / `WITH DEFAULT KEY` here.
    // ABAP accepts `STANDARD TABLE OF <type>` in a METHODS parameter type,
    // but not the key clause inline — a named TYPES alias would be required
    // for that. Callers that want a specific key behaviour should declare a
    // named table type in the types interface and reference it directly.
    return `STANDARD TABLE OF ${row}`;
  }
  if (isPlainObjectSchema(schema)) {
    const comp = matchComponent(schema, index);
    return comp ? typeInterfaceMember(typesInterfaceName, comp) : 'string';
  }
  return mapPrimitive(schema);
}

/**
 * Build an ABAP `TypeRef` for a schema usable as an inline type reference
 * (no TableType nodes — tables are encoded as verbatim `NamedTypeRef`s so
 * the printer can emit `STANDARD TABLE OF ... WITH EMPTY KEY` inline).
 */
function schemaToTypeRef(
  schema: JsonSchema | undefined,
  index: ComponentIndex,
  typesInterfaceName: string,
): TypeRef {
  if (!schema) return builtinType({ name: 'string' });
  if (isRef(schema)) {
    const name = componentNameFromRef(schema.$ref);
    if (name) {
      return namedTypeRef({
        name: typeInterfaceMember(typesInterfaceName, name),
      });
    }
    return builtinType({ name: 'string' });
  }
  const t = pluckType(schema);
  if (t === 'array') {
    return namedTypeRef({
      name: renderSchemaTypeSource(schema, index, typesInterfaceName),
    });
  }
  if (isPlainObjectSchema(schema)) {
    const comp = matchComponent(schema, index);
    if (comp) {
      return namedTypeRef({
        name: typeInterfaceMember(typesInterfaceName, comp),
      });
    }
    return builtinType({ name: 'string' });
  }
  // Primitive.
  return builtinType({ name: mapPrimitive(schema) });
}

// ----- Response selection ------------------------------------------------

interface SuccessPick {
  readonly response: NormalizedResponse;
  readonly status: number | 'default';
  readonly schema?: JsonSchema;
}

function pickSuccess(op: NormalizedOperation): SuccessPick | undefined {
  const successes = op.responses.filter((r) => r.isSuccess);
  if (successes.length === 0) return undefined;
  let chosen: NormalizedResponse | undefined;
  chosen = successes.find((r) => r.statusCode === '200');
  if (!chosen) {
    // Smallest 2xx, otherwise 'default'.
    const twoXx = successes
      .filter((r) => /^2\d\d$/.test(r.statusCode))
      .sort((a, b) => Number(a.statusCode) - Number(b.statusCode));
    chosen = twoXx[0] ?? successes[0];
  }
  const status: number | 'default' =
    chosen.statusCode === 'default' ? 'default' : Number(chosen.statusCode);
  // Prefer application/json; then application/octet-stream; then first.
  const content = chosen.content;
  const preferred =
    content['application/json'] ??
    content['application/octet-stream'] ??
    content[Object.keys(content)[0] ?? ''];
  const schema = preferred?.schema;
  const hasSchema = schema !== undefined && Object.keys(schema).length > 0;
  return { response: chosen, status, schema: hasSchema ? schema : undefined };
}

function pickRequestBodySchema(
  op: NormalizedOperation,
): JsonSchema | undefined {
  const rb = op.requestBody;
  if (!rb) return undefined;
  const c = rb.content;
  const preferred =
    c['application/json'] ??
    c['application/octet-stream'] ??
    c[Object.keys(c)[0] ?? ''];
  const schema = preferred?.schema;
  if (!schema) return undefined;
  return Object.keys(schema).length > 0 ? schema : undefined;
}

// ----- Returning-name derivation ----------------------------------------

function deriveReturningName(
  schema: JsonSchema | undefined,
  index: ComponentIndex,
): string {
  if (!schema) return 'result';
  if (isRef(schema)) {
    const name = componentNameFromRef(schema.$ref);
    return name ? sanitizeIdent(name, 'param') : 'result';
  }
  const t = pluckType(schema);
  if (t === 'array') {
    const items = (schema as { items?: unknown }).items;
    if (isRecord(items)) {
      const inner = deriveReturningName(items as JsonSchema, index);
      if (inner === 'result') return 'results';
      return pluralize(inner);
    }
    return 'results';
  }
  if (isPlainObjectSchema(schema)) {
    const comp = matchComponent(schema, index);
    if (comp) return sanitizeIdent(comp, 'param');
    return 'result';
  }
  return 'result';
}

function pluralize(name: string): string {
  if (!name) return 'results';
  if (/(s|x|z|ch|sh)$/i.test(name)) return `${name}_list`;
  if (/y$/i.test(name) && !/[aeiou]y$/i.test(name)) {
    return `${name.slice(0, -1)}ies`;
  }
  return `${name}s`;
}

// ----- Parameter ordering ------------------------------------------------

function orderParams(params: readonly NormalizedParameter[]): {
  emitted: readonly NormalizedParameter[];
  cookieSkipped: readonly NormalizedParameter[];
} {
  const path = params.filter((p) => p.in === 'path');
  const query = params.filter((p) => p.in === 'query');
  const header = params.filter((p) => p.in === 'header');
  const cookie = params.filter((p) => p.in === 'cookie');
  return {
    emitted: [...path, ...query, ...header],
    cookieSkipped: cookie,
  };
}

// ----- ABAPDoc assembly --------------------------------------------------

function buildMethodAbapDoc(
  op: NormalizedOperation,
  cookieSkipped: readonly NormalizedParameter[],
): string[] {
  const lines: string[] = [];
  lines.push(`@openapi-operation ${op.operationId}`);
  lines.push(`@openapi-path ${op.method.toUpperCase()} ${op.path}`);
  if (op.summary) {
    for (const l of op.summary.split(/\r?\n/)) {
      if (l.trim().length > 0) lines.push(l.trim());
    }
  }
  if (op.deprecated) {
    lines.push('@openapi-deprecated');
  }
  for (const c of cookieSkipped) {
    lines.push(`@openapi-todo cookie param '${c.name}' not mapped`);
  }
  return lines;
}

// -----------------------------------------------------------------------
// Main entry
// -----------------------------------------------------------------------

export function emitOperationsInterface(
  spec: NormalizedSpec,
  _plan: TypePlan,
  opts: EmitOperationsInterfaceOptions,
): EmitOperationsInterfaceResult {
  const compIndex = buildComponentIndex(spec);

  // Method-name allocator — scoped to the interface.
  const usedMethodNames = new Set<string>();
  const allocMethod = makeNameAllocator(usedMethodNames);

  const methods: ReturnType<typeof methodDef>[] = [];
  const mappings: OperationMapping[] = [];

  for (const op of spec.operations) {
    const methodName = allocMethod(op.operationId, 'method');
    const { emitted, cookieSkipped } = orderParams(op.parameters);

    // Per-method param-name allocator (avoid clashing with `body`, returning).
    const usedParamNames = new Set<string>();
    const allocParam = makeNameAllocator(usedParamNames);

    const abapParams: MethodParam[] = [];
    const paramMappings: OperationParamMapping[] = [];

    for (const p of emitted) {
      const abapName = allocParam(p.name, 'param');
      const ref = schemaToTypeRef(p.schema, compIndex, opts.typesInterfaceName);
      abapParams.push(
        methodParam({
          paramKind: 'importing',
          name: abapName,
          typeRef: ref,
          optional: !p.required,
        }),
      );
      paramMappings.push({
        name: abapName,
        openapiName: p.name,
        location: p.in as 'path' | 'query' | 'header',
        required: p.required,
        typeRefSource: renderTypeRefSource(ref),
      });
    }

    const bodySchema = pickRequestBodySchema(op);
    const hasBody = bodySchema !== undefined;
    if (hasBody) {
      const bodyName = allocParam('body', 'param');
      const ref = schemaToTypeRef(
        bodySchema,
        compIndex,
        opts.typesInterfaceName,
      );
      abapParams.push(
        methodParam({
          paramKind: 'importing',
          name: bodyName,
          typeRef: ref,
          optional: op.requestBody?.required === false ? true : false,
        }),
      );
    }

    // Returning.
    const success = pickSuccess(op);
    let successStatus: number | 'default';
    let successIsEmptyBody: boolean;
    let returningName: string;
    let returningRef: TypeRef;

    if (!success) {
      successStatus = 200;
      successIsEmptyBody = true;
      returningName = allocParam('success', 'param');
      returningRef = builtinType({ name: 'abap_bool' });
    } else if (success.schema === undefined) {
      successStatus = success.status;
      successIsEmptyBody = true;
      returningName = allocParam('success', 'param');
      returningRef = builtinType({ name: 'abap_bool' });
    } else {
      successStatus = success.status;
      successIsEmptyBody = false;
      const derived = deriveReturningName(success.schema, compIndex);
      returningName = allocParam(derived, 'param');
      returningRef = schemaToTypeRef(
        success.schema,
        compIndex,
        opts.typesInterfaceName,
      );
    }

    abapParams.push(
      methodParam({
        paramKind: 'returning',
        name: returningName,
        typeRef: returningRef,
      }),
    );

    // Error responses.
    const errorResponses: Record<string, { description?: string }> = {};
    for (const r of op.responses) {
      if (!r.isError) continue;
      errorResponses[r.statusCode] = r.description
        ? { description: r.description }
        : {};
    }

    const method = methodDef({
      name: methodName,
      visibility: 'public',
      params: abapParams,
      raising: [namedTypeRef({ name: opts.exceptionClassName.toLowerCase() })],
      abapDoc: buildMethodAbapDoc(op, cookieSkipped),
    });
    methods.push(method);

    mappings.push({
      operationId: op.operationId,
      methodName,
      method: op.method.toUpperCase(),
      path: op.path,
      params: paramMappings,
      hasBody,
      successStatus,
      successIsEmptyBody,
      errorResponses,
      returningName,
    });
  }

  const iface = interfaceDef({
    name: opts.name.toLowerCase(),
    members: methods,
    abapDoc: opts.interfaceAbapDoc,
  });

  return { interface: iface, operations: mappings };
}

function renderTypeRefSource(ref: TypeRef): string {
  switch (ref.kind) {
    case 'BuiltinType':
      return ref.name;
    case 'NamedTypeRef':
      return ref.name;
    case 'TableType':
    case 'StructureType':
      return ref.kind;
  }
}
