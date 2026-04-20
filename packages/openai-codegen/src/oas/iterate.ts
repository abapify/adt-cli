import type {
  JsonSchema,
  NormalizedOperation,
  NormalizedSpec,
} from './types.js';

export interface SchemaVisit {
  path: string[];
  schema: JsonSchema;
}

export type SchemaVisitor = (visit: SchemaVisit) => void;

/**
 * Depth-first walk over every distinct schema reachable from a normalized
 * spec. Ordering is deterministic: components.schemas (by insertion order),
 * then operations in spec order, with each operation yielding
 * `parameters → requestBody → responses`. Inside each schema we descend into
 * `properties`, `items`, `additionalProperties`, `allOf`/`anyOf`/`oneOf`, and
 * `not`.
 */
export function walkSchemas(spec: NormalizedSpec, cb: SchemaVisitor): void {
  const seen = new WeakSet<object>();

  const visit = (schema: unknown, path: string[]): void => {
    if (!isRecord(schema)) return;
    if (seen.has(schema)) return;
    seen.add(schema);
    cb({ path, schema });

    if (isRecord(schema.properties)) {
      for (const [name, sub] of Object.entries(schema.properties)) {
        visit(sub, [...path, 'properties', name]);
      }
    }
    if (schema.items !== undefined) {
      visit(schema.items, [...path, 'items']);
    }
    if (
      schema.additionalProperties !== undefined &&
      schema.additionalProperties !== true &&
      schema.additionalProperties !== false
    ) {
      visit(schema.additionalProperties, [...path, 'additionalProperties']);
    }
    for (const combinator of ['allOf', 'anyOf', 'oneOf'] as const) {
      const arr = schema[combinator];
      if (Array.isArray(arr)) {
        arr.forEach((sub, idx) => {
          visit(sub, [...path, combinator, String(idx)]);
        });
      }
    }
    if (schema.not !== undefined) {
      visit(schema.not, [...path, 'not']);
    }
  };

  for (const [name, schema] of Object.entries(spec.schemas)) {
    visit(schema, ['components', 'schemas', name]);
  }

  for (const op of spec.operations) {
    const base = ['operations', operationKey(op)];
    for (const p of op.parameters) {
      visit(p.schema, [...base, 'parameters', `${p.in}:${p.name}`]);
    }
    if (op.requestBody !== undefined) {
      for (const [mt, mtObj] of Object.entries(op.requestBody.content)) {
        visit(mtObj.schema, [...base, 'requestBody', mt]);
      }
    }
    for (const resp of op.responses) {
      for (const [mt, mtObj] of Object.entries(resp.content)) {
        visit(mtObj.schema, [...base, 'responses', resp.statusCode, mt]);
      }
      for (const [hn, h] of Object.entries(resp.headers)) {
        visit(h.schema, [...base, 'responses', resp.statusCode, 'headers', hn]);
      }
    }
  }
}

/** Stable key used to identify an operation, e.g. `GET /pet/{petId}`. */
export function operationKey(op: NormalizedOperation): string {
  return `${op.method.toUpperCase()} ${op.path}`;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
