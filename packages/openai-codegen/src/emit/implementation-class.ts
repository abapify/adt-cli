/**
 * Layer 3 emitter — IMPLEMENTATION CLASS (`ZCL_<base>`).
 *
 * The generated class is deliberately minimal: it INTERFACES the operations
 * interface, holds one private reference to the bundled local HTTP client,
 * and emits one METHOD per operation whose body:
 *
 *   1. Calls `client->fetch( ... )` with method / path / query / headers /
 *      body, capturing the result in `DATA(response)`.
 *   2. Delegates to the response-mapper to emit the `CASE response->status( )`
 *      block that turns each OpenAPI response onto either a RETURNING
 *      assignment or a `RAISE EXCEPTION NEW zcx_...` statement.
 *
 * The @abapify/abap-ast printer does not currently model `CASE` / `WHEN`
 * nodes, and modelling a mixed-indent multi-line method call via the call
 * expression is awkward. For these two shapes we use `raw({ source })`
 * statements — the printer emits them verbatim at the current indent.
 */
import {
  attributeDef,
  builtinType,
  classDef,
  literal,
  methodDef,
  methodImpl,
  methodParam,
  namedTypeRef,
  raw,
  section,
  type ClassDef,
  type Statement,
} from '@abapify/abap-ast';

import { mapResponseHandling, type SuccessBodyKind } from './response-mapper';
import type { ResolvedNames } from './naming';
import type { OperationMapping } from './operations-interface';
import type {
  JsonSchema,
  NormalizedOperation,
  NormalizedResponse,
  NormalizedSpec,
} from '../oas/types';
import { isRef } from '../oas/types';

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

export interface EmitImplementationClassOptions {
  readonly names: ResolvedNames;
  /** Default server path written into the constructor DEFAULT clause. */
  readonly defaultServer?: string;
}

export interface EmitImplementationClassResult {
  readonly class: ClassDef;
}

export function emitImplementationClass(
  spec: NormalizedSpec,
  operations: readonly OperationMapping[],
  opts: EmitImplementationClassOptions,
): EmitImplementationClassResult {
  const { names } = opts;
  const className = names.implementationClass;
  const ifaceName = names.operationsInterface.toLowerCase();
  const httpLocal = names.localHttpClass;
  const jsonLocal = names.localJsonClass;
  const excLocal = names.exceptionClass.toLowerCase();
  const defaultServer = opts.defaultServer ?? '/api/v3';

  // -- PUBLIC SECTION ---------------------------------------------------
  // INTERFACES zif_<op>. plus METHODS constructor.
  const ctorDecl = methodDef({
    name: 'constructor',
    visibility: 'public',
    params: [
      methodParam({
        paramKind: 'importing',
        name: 'destination',
        typeRef: builtinType({ name: 'string' }),
      }),
      methodParam({
        paramKind: 'importing',
        name: 'server',
        typeRef: builtinType({ name: 'string' }),
        default: literal({ literalKind: 'string', value: defaultServer }),
      }),
    ],
  });

  const publicSection = section({
    visibility: 'public',
    members: [ctorDecl],
  });

  // -- PRIVATE SECTION --------------------------------------------------
  // DATA client TYPE REF TO lcl_http.
  // Abused: NamedTypeRef stores the raw inline type after "TYPE ".
  const clientAttr = attributeDef({
    name: 'client',
    type: namedTypeRef({ name: `REF TO ${httpLocal}` }),
    visibility: 'private',
  });

  const privateSection = section({
    visibility: 'private',
    members: [clientAttr],
  });

  // -- IMPLEMENTATIONS -------------------------------------------------
  const ctorImpl = methodImpl({
    name: 'constructor',
    body: [
      raw({
        source: `client = NEW ${httpLocal}( destination = destination server = server ).`,
      }),
    ],
  });

  const byId = new Map<string, NormalizedOperation>();
  for (const op of spec.operations) byId.set(op.operationId, op);

  const operationImpls = operations.map((mapping) => {
    const op = byId.get(mapping.operationId);
    if (op === undefined) {
      throw new Error(
        `emitImplementationClass: operation "${mapping.operationId}" not found in spec`,
      );
    }
    const bodyStmts = buildOperationBody(op, mapping, {
      httpLocal,
      jsonLocal,
      exceptionClassName: excLocal,
    });
    return methodImpl({
      name: `${ifaceName}~${mapping.methodName}`,
      body: bodyStmts,
    });
  });

  const cls = classDef({
    name: className,
    interfaces: [ifaceName],
    sections: [publicSection, privateSection],
    implementations: [ctorImpl, ...operationImpls],
  });

  return { class: cls };
}

// -----------------------------------------------------------------------
// Method body construction
// -----------------------------------------------------------------------

interface BodyCtx {
  readonly httpLocal: string;
  readonly jsonLocal: string;
  readonly exceptionClassName: string;
}

function buildOperationBody(
  op: NormalizedOperation,
  mapping: OperationMapping,
  ctx: BodyCtx,
): Statement[] {
  const bodySchema = pickRequestBodySchema(op);
  const bodyIsBinary = isBinaryRequestBody(op, bodySchema);

  const fetchSource = renderFetchCall(mapping, bodyIsBinary);

  const successBody = decideSuccessBody(op, mapping);
  const caseResult = mapResponseHandling(op, {
    exceptionClassName: ctx.exceptionClassName,
    localJsonClassName: ctx.jsonLocal,
    successBody,
  });

  return [raw({ source: fetchSource }), caseResult.statement];
}

// -----------------------------------------------------------------------
// fetch( ... ) call rendering
// -----------------------------------------------------------------------

function renderFetchCall(
  mapping: OperationMapping,
  bodyIsBinary: boolean,
): string {
  type Arg = { readonly key: string; readonly value: string };
  const args: Arg[] = [];

  args.push({ key: 'method', value: `'${mapping.method}'` });
  args.push({ key: 'path', value: renderPathValue(mapping) });

  const queryParams = mapping.params.filter((p) => p.location === 'query');
  if (queryParams.length > 0) {
    const items = queryParams
      .map(
        (p) =>
          `( name = '${escapeSingleQuotes(p.openapiName)}' value = ${p.name} )`,
      )
      .join(' ');
    args.push({ key: 'query', value: `VALUE #( ${items} )` });
  }

  const headerParams = mapping.params.filter((p) => p.location === 'header');
  const headerItems: string[] = [];

  if (mapping.hasBody) {
    if (bodyIsBinary) {
      args.push({ key: 'binary', value: 'body' });
    } else {
      args.push({ key: 'body', value: 'json=>stringify( body )' });
      headerItems.push(`( name = 'Content-Type' value = 'application/json' )`);
    }
  }

  for (const h of headerParams) {
    headerItems.push(
      `( name = '${escapeSingleQuotes(h.openapiName)}' value = ${h.name} )`,
    );
  }

  if (headerItems.length > 0) {
    args.push({ key: 'headers', value: `VALUE #( ${headerItems.join(' ')} )` });
  }

  const head = 'DATA(response) = client->fetch(';
  // Single-line form for ≤ 2 args.
  if (args.length <= 2) {
    const inline = args.map((a) => `${a.key} = ${a.value}`).join(' ');
    return `${head} ${inline} ).`;
  }

  // Multi-line aligned form for 3+ args.
  const maxKey = Math.max(...args.map((a) => a.key.length));
  const lines: string[] = [head];
  args.forEach((a, idx) => {
    const pad = ' '.repeat(maxKey - a.key.length);
    const isLast = idx === args.length - 1;
    const tail = isLast ? ' ).' : '';
    lines.push(`  ${a.key}${pad} = ${a.value}${tail}`);
  });
  return lines.join('\n');
}

/** `'<path>'` when no path params, otherwise a `|...|` string template. */
function renderPathValue(mapping: OperationMapping): string {
  const pathParams = mapping.params.filter((p) => p.location === 'path');
  if (pathParams.length === 0) {
    return `'${escapeSingleQuotes(mapping.path)}'`;
  }
  const byOriginal = new Map<string, string>();
  for (const p of pathParams) byOriginal.set(p.openapiName, p.name);

  let out = '|';
  let i = 0;
  const src = mapping.path;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, open);
    const close = src.indexOf('}', open);
    if (close === -1) {
      // Unclosed placeholder — emit verbatim to preserve source fidelity.
      out += src.slice(open);
      break;
    }
    const placeholder = src.slice(open + 1, close);
    const abapName = byOriginal.get(placeholder) ?? placeholder;
    out += `{ ${abapName} }`;
    i = close + 1;
  }
  out += '|';
  return out;
}

// -----------------------------------------------------------------------
// Response-body and request-body shape inspection
// -----------------------------------------------------------------------

function decideSuccessBody(
  op: NormalizedOperation,
  mapping: OperationMapping,
): SuccessBodyKind {
  if (mapping.successIsEmptyBody) {
    return { kind: 'empty', returningName: mapping.returningName };
  }
  const picked = pickSuccessResponse(op);
  const schema = picked ? pickPreferredSchema(picked.content) : undefined;
  if (schema !== undefined && isBinarySchema(schema)) {
    return { kind: 'binary', returningName: mapping.returningName };
  }
  // Default: JSON.
  return { kind: 'json', returningName: mapping.returningName };
}

function pickSuccessResponse(
  op: NormalizedOperation,
): NormalizedResponse | undefined {
  const twoXX = op.responses
    .filter((r) => /^2\d\d$/.test(r.statusCode))
    .sort((a, b) => Number(a.statusCode) - Number(b.statusCode));
  if (twoXX.length > 0) return twoXX[0];
  return op.responses.find((r) => r.statusCode === 'default');
}

function pickRequestBodySchema(
  op: NormalizedOperation,
): JsonSchema | undefined {
  const rb = op.requestBody;
  if (!rb) return undefined;
  return pickPreferredSchema(rb.content);
}

function pickPreferredSchema(
  content: Record<string, { schema: JsonSchema }> | undefined,
): JsonSchema | undefined {
  if (!content) return undefined;
  const json = content['application/json'];
  if (json !== undefined) {
    return nonEmpty(json.schema);
  }
  const octet = content['application/octet-stream'];
  if (octet !== undefined) {
    return nonEmpty(octet.schema);
  }
  const first = Object.keys(content)[0];
  if (first !== undefined) return nonEmpty(content[first].schema);
  return undefined;
}

function nonEmpty(schema: JsonSchema | undefined): JsonSchema | undefined {
  if (schema === undefined) return undefined;
  return Object.keys(schema).length > 0 ? schema : undefined;
}

function isBinarySchema(schema: JsonSchema | undefined): boolean {
  if (!schema) return false;
  if (isRef(schema)) return false;
  const t = (schema as { type?: unknown }).type;
  const f = (schema as { format?: unknown }).format;
  return t === 'string' && (f === 'binary' || f === 'byte');
}

function isBinaryRequestBody(
  op: NormalizedOperation,
  schema: JsonSchema | undefined,
): boolean {
  if (isBinarySchema(schema)) return true;
  const content = op.requestBody?.content;
  if (!content) return false;
  // If the only media type is octet-stream, treat as binary.
  const keys = Object.keys(content);
  if (keys.length === 1 && keys[0] === 'application/octet-stream') {
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------
// Misc.
// -----------------------------------------------------------------------

function escapeSingleQuotes(s: string): string {
  return s.replace(/'/g, "''");
}
