/**
 * Layer-1 types interface emitter.
 *
 * Builds a single global ABAP interface (e.g. `ZIF_PETSTORE_TYPES`) that
 * declares every OpenAPI component schema as a `TYPES` entry, in
 * topological order. Naming follows the v2 convention: no `ty_` prefix —
 * the OpenAPI schema name is snake_cased directly.
 *
 * See packages/openai-codegen/AGENTS.md style references. This module
 * intentionally bypasses the existing `ty_`-prefixed `mapSchemaToTypeDef`
 * in `../types/map` and reconstructs TypeDef nodes from scratch so it can
 * honour the v2 rules (bare names, per-schema map types, cyclic back-ref
 * detection, controllable null flags, polymorphism union merge).
 */
import {
  builtinType,
  enumType,
  interfaceDef,
  namedTypeRef,
  structureType,
  tableType,
  typeDef,
  type InterfaceDef,
  type StructureField,
  type TypeDef,
  type TypeRef,
} from '@abapify/abap-ast';
import type { JsonSchema, NormalizedSpec } from '../oas/types';
import { isRef } from '../oas/types';
import type { TypePlan, TypePlanEntry } from '../types/plan';
import { makeNameAllocator, sanitizeIdent } from '../types/naming';

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface EmitTypesInterfaceOptions {
  /** UPPERCASE ABAP global interface name, e.g. 'ZIF_PETSTORE_TYPES'. */
  readonly name: string;
  /**
   * When true, nullable fields (`nullable: true` or `type: [..., "null"]`)
   * receive a sibling `<field>_is_null TYPE abap_bool` flag. Default false.
   */
  readonly emitNullFlags?: boolean;
  /** Optional ABAPDoc header lines for the interface itself. */
  readonly interfaceAbapDoc?: readonly string[];
}

export interface EmitTypesInterfaceResult {
  readonly interface: InterfaceDef;
  readonly typeDefs: readonly TypeDef[];
}

/** Raised when polymorphism variants disagree on the type of a named field. */
export class PolymorphismConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolymorphismConflictError';
  }
}

export function emitTypesInterface(
  spec: NormalizedSpec,
  plan: TypePlan,
  opts: EmitTypesInterfaceOptions,
): EmitTypesInterfaceResult {
  if (!opts.name) {
    throw new Error('emitTypesInterface: opts.name is required');
  }
  const ctx = buildContext(spec, plan, opts);

  const typeDefs: TypeDef[] = [];
  for (const entry of plan.entries) {
    if (entry.source === 'auxiliary') {
      // Skip the shared `aux.kv` entry — v2 emits per-schema map types.
      continue;
    }
    const aux = ctx.mapAux.get(entry.id);
    if (aux) {
      typeDefs.push(aux.entryTypeDef);
      typeDefs.push(aux.mapTypeDef);
    }
    typeDefs.push(buildEntryTypeDef(entry, ctx));
  }

  return {
    interface: interfaceDef({
      name: opts.name,
      members: typeDefs,
      abapDoc: opts.interfaceAbapDoc,
    }),
    typeDefs,
  };
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

interface MapAux {
  readonly entryName: string;
  readonly mapName: string;
  readonly entryTypeDef: TypeDef;
  readonly mapTypeDef: TypeDef;
}

interface Ctx {
  readonly spec: NormalizedSpec;
  readonly plan: TypePlan;
  readonly opts: EmitTypesInterfaceOptions;
  /** entry.id → emitted v2 name. */
  readonly nameOf: ReadonlyMap<string, string>;
  /** entry.id → position in plan.entries. */
  readonly positionOf: ReadonlyMap<string, number>;
  /** entry.id → original OpenAPI schema name (component schemas only). */
  readonly originalNameOf: ReadonlyMap<string, string>;
  /** entry.id → per-schema map aux types (when additionalProperties present). */
  readonly mapAux: ReadonlyMap<string, MapAux>;
  /**
   * Per entry-id, list of back-edge notes accumulated while building fields.
   * Flushed into the TypeDef's abapDoc.
   */
  readonly backRefs: Map<string, string[]>;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function pluckType(schema: JsonSchema): string | undefined {
  const t = (schema as { type?: unknown }).type;
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) {
    const nonNull = t.filter((x): x is string => x !== 'null');
    if (nonNull.length >= 1) return nonNull[0];
  }
  return undefined;
}

function isNullable(schema: JsonSchema): boolean {
  const rec = schema as Record<string, unknown>;
  if (rec.nullable === true) return true;
  const t = rec.type;
  if (Array.isArray(t) && t.includes('null')) return true;
  return false;
}

function componentNameFromRef(ref: string): string | undefined {
  const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
  return m ? m[1] : undefined;
}

function originalNameFromId(id: string): string | undefined {
  const m = /^components\.schemas\.(.+)$/.exec(id);
  return m ? m[1] : undefined;
}

/** Normalise a raw name for v2: replace `$` with `_`, then snake_case ≤ 30. */
function v2Name(
  raw: string,
  allocator: ReturnType<typeof makeNameAllocator>,
): string {
  const pre = raw.replace(/\$/g, '_');
  return allocator(pre, 'type');
}

// -----------------------------------------------------------------------------
// Context construction
// -----------------------------------------------------------------------------

function buildContext(
  spec: NormalizedSpec,
  plan: TypePlan,
  opts: EmitTypesInterfaceOptions,
): Ctx {
  const used = new Set<string>();
  const alloc = makeNameAllocator(used);

  const nameOf = new Map<string, string>();
  const originalNameOf = new Map<string, string>();
  const positionOf = new Map<string, number>();
  plan.entries.forEach((e, idx) => positionOf.set(e.id, idx));

  // Allocate v2 names for all non-auxiliary entries first.
  for (const entry of plan.entries) {
    if (entry.source === 'auxiliary') continue;
    const raw = deriveRawName(entry);
    const v2 = v2Name(raw, alloc);
    nameOf.set(entry.id, v2);
    const orig = originalNameFromId(entry.id);
    if (orig !== undefined) originalNameOf.set(entry.id, orig);
  }

  // Pre-compute per-schema map aux types for entries with additionalProperties.
  const mapAux = new Map<string, MapAux>();
  const backRefs = new Map<string, string[]>();
  for (const entry of plan.entries) backRefs.set(entry.id, []);

  const ctxStub: Ctx = {
    spec,
    plan,
    opts,
    nameOf,
    positionOf,
    originalNameOf,
    mapAux,
    backRefs,
  };

  for (const entry of plan.entries) {
    if (entry.source === 'auxiliary') continue;
    const ap = (entry.schema as { additionalProperties?: unknown })
      .additionalProperties;
    if (ap === undefined || ap === false) continue;
    const base = nameOf.get(entry.id)!;
    const entryName = v2Name(`${base}_map_entry`, alloc);
    const mapName = v2Name(`${base}_map`, alloc);
    const valueSchema: JsonSchema = isRecord(ap)
      ? (ap as JsonSchema)
      : {
          type: 'string',
        };
    const valueRef = asFieldTypeRef(
      resolveTypeRef(valueSchema, entry.id, ctxStub),
    );
    const entryTypeDef = typeDef({
      name: entryName,
      type: structureType({
        fields: [
          { name: 'key', type: builtinType({ name: 'string' }) },
          { name: 'value', type: valueRef },
        ],
      }),
      abapDoc: [`@openapi-map-entry ${originalNameFromId(entry.id) ?? base}`],
    });
    const mapTypeDef = typeDef({
      name: mapName,
      type: tableType({
        rowType: namedTypeRef({ name: entryName }),
        tableKind: 'standard',
      }),
      abapDoc: [`@openapi-map ${originalNameFromId(entry.id) ?? base}`],
    });
    mapAux.set(entry.id, { entryName, mapName, entryTypeDef, mapTypeDef });
  }

  return ctxStub;
}

function deriveRawName(entry: TypePlanEntry): string {
  // Strip the `ty_` prefix the planner applied; if the original schema name
  // was something exotic (inline), fall back to a path-derived identifier.
  const stripped = entry.abapName.replace(/^ty_/, '');
  const orig = originalNameFromId(entry.id);
  if (orig !== undefined) return orig;
  // Inline entries: keep the sanitized ty-stripped name.
  return stripped || entry.id;
}

// -----------------------------------------------------------------------------
// TypeDef construction per entry
// -----------------------------------------------------------------------------

function buildEntryTypeDef(entry: TypePlanEntry, ctx: Ctx): TypeDef {
  const name = ctx.nameOf.get(entry.id)!;
  const schema = entry.schema;
  const leadingDoc: string[] = [];
  const original = ctx.originalNameOf.get(entry.id);
  if (original !== undefined) {
    leadingDoc.push(`@openapi-schema ${original}`);
  } else if (entry.source === 'inline') {
    leadingDoc.push(`@openapi-path ${entry.id}`);
  }
  const description = (schema as { description?: unknown }).description;
  if (typeof description === 'string' && description.trim()) {
    for (const line of description.split(/\r?\n/)) {
      leadingDoc.push(`@openapi-description ${line}`);
    }
  }

  // Enum shortcut: string with enum values.
  const enumValues = (schema as { enum?: unknown }).enum;
  const schemaType = pluckType(schema);
  if (
    Array.isArray(enumValues) &&
    (schemaType === 'string' || schemaType === undefined)
  ) {
    const members: { name: string; value: string | number }[] = [];
    const seen = new Set<string>();
    for (const v of enumValues) {
      if (typeof v === 'string') {
        let nm = sanitizeIdent(v, 'type');
        let i = 2;
        while (seen.has(nm)) {
          nm = `${nm}_${i++}`;
        }
        seen.add(nm);
        members.push({ name: nm, value: v });
      } else if (typeof v === 'number') {
        let nm = sanitizeIdent(`v_${v}`, 'type');
        let i = 2;
        while (seen.has(nm)) {
          nm = `${nm}_${i++}`;
        }
        seen.add(nm);
        members.push({ name: nm, value: v });
      }
    }
    if (members.length > 0) {
      return typeDef({
        name,
        type: enumType({
          baseType: builtinType({ name: 'string' }),
          members,
        }),
        abapDoc: leadingDoc.length > 0 ? leadingDoc : undefined,
      });
    }
  }

  // Array alias at top level: `TYPES foo TYPE STANDARD TABLE OF <x> ...`.
  if (schemaType === 'array') {
    const items = (schema as { items?: unknown }).items;
    const rowSchema: JsonSchema = isRecord(items) ? (items as JsonSchema) : {};
    const def = typeDef({
      name,
      type: tableType({
        rowType: resolveTypeRef(rowSchema, entry.id, ctx),
        tableKind: 'standard',
      }),
      abapDoc: finaliseDoc(leadingDoc, ctx.backRefs.get(entry.id) ?? []),
    });
    return def;
  }

  // Object / combinator / map: emit STRUCTURE.
  const hasObjectShape =
    schemaType === 'object' ||
    isRecord((schema as { properties?: unknown }).properties) ||
    Array.isArray((schema as { allOf?: unknown }).allOf) ||
    Array.isArray((schema as { oneOf?: unknown }).oneOf) ||
    Array.isArray((schema as { anyOf?: unknown }).anyOf) ||
    ctx.mapAux.has(entry.id);

  if (hasObjectShape) {
    const fields = buildStructureFields(entry, ctx);
    const finalFields =
      fields.length > 0
        ? fields
        : [
            {
              name: '_placeholder',
              type: builtinType({ name: 'string' }),
            } satisfies StructureField,
          ];
    return typeDef({
      name,
      type: structureType({ fields: finalFields }),
      abapDoc: finaliseDoc(leadingDoc, ctx.backRefs.get(entry.id) ?? []),
    });
  }

  // Primitive alias.
  return typeDef({
    name,
    type: builtinType({ name: mapPrimitiveLocal(schema) }),
    abapDoc: finaliseDoc(leadingDoc, ctx.backRefs.get(entry.id) ?? []),
  });
}

function finaliseDoc(
  base: string[],
  backRefs: readonly string[],
): readonly string[] | undefined {
  const out = [...base];
  for (const br of backRefs) out.push(br);
  return out.length > 0 ? out : undefined;
}

// -----------------------------------------------------------------------------
// Structure field construction (merge allOf / oneOf / anyOf / properties /
// additionalProperties).
// -----------------------------------------------------------------------------

function buildStructureFields(
  entry: TypePlanEntry,
  ctx: Ctx,
): StructureField[] {
  const schema = entry.schema;
  const fields: StructureField[] = [];
  const seen = new Map<string, TypeRef>();

  const addField = (rawName: string, rawType: TypeRef, src: JsonSchema) => {
    const type = asFieldTypeRef(rawType);
    const fieldName = sanitizeIdent(rawName.replace(/\$/g, '_'), 'param');
    const prev = seen.get(fieldName);
    if (prev !== undefined) {
      if (!typeRefEqual(prev, type)) {
        throw new PolymorphismConflictError(
          `buildStructureFields: conflicting types for field "${fieldName}" in "${entry.id}"`,
        );
      }
      return;
    }
    seen.set(fieldName, type);
    fields.push({ name: fieldName, type });
    if (ctx.opts.emitNullFlags && isNullable(src)) {
      const flagName = sanitizeIdent(`${rawName}_is_null`, 'param');
      if (!seen.has(flagName)) {
        const flagType = builtinType({ name: 'abap_bool' });
        seen.set(flagName, flagType);
        fields.push({ name: flagName, type: flagType });
      }
    }
  };

  const mergeProperties = (src: JsonSchema) => {
    const props = (src as { properties?: unknown }).properties;
    if (isRecord(props)) {
      for (const [propName, propSchema] of Object.entries(props)) {
        if (!isRecord(propSchema)) continue;
        const ref = resolveTypeRef(
          propSchema as JsonSchema,
          entry.id,
          ctx,
          propName,
        );
        addField(propName, ref, propSchema as JsonSchema);
      }
    }
  };

  // 1) allOf — merged union of properties; conflicting field types throw.
  const allOf = (schema as { allOf?: unknown }).allOf;
  if (Array.isArray(allOf)) {
    for (const sub of allOf) {
      if (!isRecord(sub)) continue;
      if (isRef(sub)) {
        const refEntry = resolveRefEntry(sub.$ref, ctx);
        if (refEntry !== undefined) mergeProperties(refEntry.schema);
      } else {
        mergeProperties(sub as JsonSchema);
      }
    }
  }

  // 2) own properties.
  mergeProperties(schema);

  // 3) oneOf / anyOf — union of properties from each variant.
  for (const combinator of ['oneOf', 'anyOf'] as const) {
    const arr = (schema as Record<string, unknown>)[combinator];
    if (!Array.isArray(arr)) continue;
    for (const sub of arr) {
      if (!isRecord(sub)) continue;
      if (isRef(sub)) {
        const refEntry = resolveRefEntry(sub.$ref, ctx);
        if (refEntry !== undefined) mergeProperties(refEntry.schema);
      } else {
        mergeProperties(sub as JsonSchema);
      }
    }
  }

  // 4) additionalProperties → replace escape-hatch with per-schema map type.
  const aux = ctx.mapAux.get(entry.id);
  if (aux) {
    const fieldName = sanitizeIdent('entries', 'param');
    if (!seen.has(fieldName)) {
      const ref = namedTypeRef({ name: aux.mapName });
      seen.set(fieldName, ref);
      fields.push({ name: fieldName, type: ref });
    }
  }

  return fields;
}

function resolveRefEntry(ref: string, ctx: Ctx): TypePlanEntry | undefined {
  const name = componentNameFromRef(ref);
  if (!name) return undefined;
  return ctx.plan.byId.get(`components.schemas.${name}`);
}

function typeRefEqual(a: TypeRef, b: TypeRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'BuiltinType' && b.kind === 'BuiltinType') {
    return a.name === b.name;
  }
  if (a.kind === 'NamedTypeRef' && b.kind === 'NamedTypeRef') {
    return a.name === b.name;
  }
  if (a.kind === 'TableType' && b.kind === 'TableType') {
    return typeRefEqual(a.rowType, b.rowType);
  }
  return false;
}

/**
 * Convert a TypeRef that may be a TableType into a form that can appear as a
 * structure-field type. The underlying ABAP printer only accepts BuiltinType
 * or NamedTypeRef inline; we synthesise a NamedTypeRef whose "name" is the
 * full inline table expression so the printer emits it verbatim.
 */
function asFieldTypeRef(t: TypeRef): TypeRef {
  if (t.kind !== 'TableType') return t;
  const row = t.rowType;
  let rowExpr: string;
  if (row.kind === 'BuiltinType') {
    rowExpr = row.name;
  } else if (row.kind === 'NamedTypeRef') {
    rowExpr = row.name;
  } else {
    // Nested table/structure as row — ABAP has no clean inline syntax for
    // this. Degrade to `string` row; callers should emit a named wrapper
    // when they need fidelity.
    rowExpr = 'string';
  }
  return namedTypeRef({
    name: `STANDARD TABLE OF ${rowExpr} WITH EMPTY KEY`,
  });
}

// -----------------------------------------------------------------------------
// TypeRef resolution for arbitrary nested schemas.
// -----------------------------------------------------------------------------

function resolveTypeRef(
  schema: JsonSchema,
  ownerEntryId: string,
  ctx: Ctx,
  fieldName?: string,
): TypeRef {
  if (isRef(schema)) {
    const target = resolveRefEntry(schema.$ref, ctx);
    if (target === undefined) {
      // Unresolvable — degrade to string.
      return builtinType({ name: 'string' });
    }
    const ownerPos = ctx.positionOf.get(ownerEntryId) ?? -1;
    const targetPos = ctx.positionOf.get(target.id) ?? -1;
    const isBackEdge = targetPos >= 0 && ownerPos >= 0 && targetPos >= ownerPos;
    const isSelf = target.id === ownerEntryId;
    if (isSelf || isBackEdge) {
      const targetOriginal =
        ctx.originalNameOf.get(target.id) ??
        ctx.nameOf.get(target.id) ??
        target.id;
      const backRefs = ctx.backRefs.get(ownerEntryId);
      if (backRefs !== undefined) {
        const label = fieldName
          ? `${fieldName}:${targetOriginal}`
          : targetOriginal;
        backRefs.push(`@openapi-ref ${label}`);
      }
      // NamedTypeRef with a multi-token name — the printer emits it verbatim
      // after `TYPE `, yielding `TYPE REF TO data`.
      return namedTypeRef({ name: 'REF TO data' });
    }
    return namedTypeRef({ name: ctx.nameOf.get(target.id) ?? target.abapName });
  }

  const type = pluckType(schema);

  if (type === 'array') {
    const items = (schema as { items?: unknown }).items;
    const rowSchema: JsonSchema = isRecord(items) ? (items as JsonSchema) : {};
    return tableType({
      rowType: resolveTypeRef(rowSchema, ownerEntryId, ctx, fieldName),
      tableKind: 'standard',
    });
  }

  const props = (schema as { properties?: unknown }).properties;
  if (type === 'object' || isRecord(props)) {
    // Prefer a planned entry for this exact schema object if one exists.
    const matched = findPlannedEntryBySchema(schema, ctx.plan, ownerEntryId);
    if (matched !== undefined) {
      const name = ctx.nameOf.get(matched.id);
      if (name !== undefined) {
        return namedTypeRef({ name });
      }
    }
    // No matching plan entry — degrade to string (inline objects that the
    // planner did not extract are unusual; a downstream wave can extend this).
    return builtinType({ name: 'string' });
  }

  if (type === undefined) {
    for (const c of ['allOf', 'oneOf', 'anyOf'] as const) {
      if (Array.isArray((schema as Record<string, unknown>)[c])) {
        const matched = findPlannedEntryBySchema(
          schema,
          ctx.plan,
          ownerEntryId,
        );
        if (matched !== undefined) {
          const name = ctx.nameOf.get(matched.id);
          if (name !== undefined) return namedTypeRef({ name });
        }
        return builtinType({ name: 'string' });
      }
    }
    return builtinType({ name: 'string' });
  }

  return builtinType({ name: mapPrimitiveLocal(schema) });
}

function findPlannedEntryBySchema(
  schema: JsonSchema,
  plan: TypePlan,
  excludeId: string | undefined,
): TypePlanEntry | undefined {
  for (const entry of plan.entries) {
    if (entry.id === excludeId) continue;
    if (entry.schema === schema) return entry;
  }
  return undefined;
}

function mapPrimitiveLocal(
  schema: JsonSchema,
):
  | 'i'
  | 'int8'
  | 'f'
  | 'decfloat34'
  | 'd'
  | 't'
  | 'timestampl'
  | 'string'
  | 'xstring'
  | 'abap_bool'
  | 'sysuuid_x16' {
  const type = pluckType(schema);
  const format = (schema as { format?: unknown }).format;
  if (type === 'boolean') return 'abap_bool';
  if (type === 'integer') {
    return format === 'int64' ? 'int8' : 'i';
  }
  if (type === 'number') {
    return format === 'float' || format === 'double' ? 'f' : 'decfloat34';
  }
  if (type === 'string') {
    switch (format) {
      case 'date':
        return 'd';
      case 'date-time':
        return 'timestampl';
      case 'uuid':
        return 'sysuuid_x16';
      case 'byte':
      case 'binary':
        return 'xstring';
      default:
        return 'string';
    }
  }
  return 'string';
}
