import {
  builtinType,
  comment,
  enumType,
  namedTypeRef,
  structureType,
  tableType,
  typeDef,
  type BuiltinTypeName,
  type Comment,
  type EnumMember,
  type StructureField,
  type TypeDef,
  type TypeRef,
} from '@abapify/abap-ast';
import type { JsonSchema } from '../oas/index';
import { isRef } from '../oas/index';
import type { TypePlan, TypePlanEntry } from './plan';
import { CollisionError, UnsupportedSchemaError } from './errors';
import { sanitizeIdent } from './naming';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Map a JSON Schema primitive (type+format) to an ABAP builtin type name. */
export function mapPrimitive(schema: JsonSchema): BuiltinTypeName {
  const type = (schema as { type?: unknown }).type;
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
  // Unknown: fallback to string.
  return 'string';
}

function refToEntry(ref: string, plan: TypePlan): TypePlanEntry | undefined {
  const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
  if (!m) return undefined;
  return plan.byId.get(`components.schemas.${m[1]}`);
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

/** Resolve a schema to an ABAP TypeRef. */
export function mapSchemaToTypeRef(
  schema: JsonSchema,
  plan: TypePlan,
  ctx: { entryId?: string } = {},
): TypeRef {
  if (isRef(schema)) {
    const entry = refToEntry(schema.$ref, plan);
    if (!entry) {
      throw new UnsupportedSchemaError(
        `mapSchemaToTypeRef: unresolved $ref "${schema.$ref}"`,
      );
    }
    return namedTypeRef({ name: entry.abapName });
  }
  const type = pluckType(schema);
  // enum on string-like scalar → points to named entry when one exists; otherwise base string.
  if (type === 'array') {
    const items = (schema as { items?: unknown }).items;
    const rowSchema: JsonSchema = isRecord(items) ? (items as JsonSchema) : {};
    return tableType({
      rowType: mapSchemaToTypeRef(rowSchema, plan, ctx),
      tableKind: 'standard',
    });
  }
  if (
    type === 'object' ||
    isRecord((schema as { properties?: unknown }).properties)
  ) {
    // Prefer a planned entry for this exact schema if one exists.
    const matched = findPlannedEntryBySchema(schema, plan, ctx.entryId);
    if (matched) return namedTypeRef({ name: matched.abapName });
    // Inline structure as fallback.
    const fields = buildStructureFields(schema, plan, ctx);
    if (fields.length === 0) {
      return builtinType({ name: 'string' });
    }
    return structureType({ fields });
  }
  if (type === undefined) {
    // Untyped schema — unless combinator present.
    for (const c of ['allOf', 'oneOf', 'anyOf'] as const) {
      if (Array.isArray((schema as Record<string, unknown>)[c])) {
        // Treat as object; let typedef emission handle full shape.
        const matched = findPlannedEntryBySchema(schema, plan, ctx.entryId);
        if (matched) return namedTypeRef({ name: matched.abapName });
        return builtinType({ name: 'string' });
      }
    }
    return builtinType({ name: 'string' });
  }
  return builtinType({ name: mapPrimitive(schema) });
}

/** If a schema is identical-by-reference to a planned entry, return it. */
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

function buildEnumMembers(values: readonly unknown[]): EnumMember[] {
  const out: EnumMember[] = [];
  for (const v of values) {
    if (typeof v === 'string') {
      const name = sanitizeIdent(v, 'type');
      out.push({ name, value: v });
    } else if (typeof v === 'number') {
      out.push({ name: sanitizeIdent(`v_${v}`, 'type'), value: v });
    }
  }
  return out;
}

/** Build the list of structure fields for an object-like schema, including
 *  combinators, nullable flags, and additionalProperties escape hatch. */
function buildStructureFields(
  schema: JsonSchema,
  plan: TypePlan,
  ctx: { entryId?: string },
): StructureField[] {
  const fields: StructureField[] = [];
  const seen = new Map<string, TypeRef>();

  const addField = (name: string, type: TypeRef, src: JsonSchema) => {
    const sanitized = sanitizeIdent(name, 'param');
    const prev = seen.get(sanitized);
    if (prev) {
      // Only allow dedupe if structurally identical (by reference or same kind+name).
      if (prev === type || shallowTypeRefEqual(prev, type)) return;
      throw new CollisionError(
        `buildStructureFields: duplicate field "${sanitized}" with conflicting types`,
      );
    }
    seen.set(sanitized, type);
    fields.push({ name: sanitized, type });
    if (isNullable(src)) {
      const flagName = sanitizeIdent(`${name}_is_null`, 'param');
      if (!seen.has(flagName)) {
        const flagType = builtinType({ name: 'abap_bool' });
        seen.set(flagName, flagType);
        fields.push({ name: flagName, type: flagType });
      }
    }
  };

  // 1) allOf merging.
  const allOf = (schema as { allOf?: unknown }).allOf;
  if (Array.isArray(allOf)) {
    for (const sub of allOf) {
      if (!isRecord(sub)) continue;
      const subSchema = sub as JsonSchema;
      const subProps = isRef(subSchema)
        ? ((): Record<string, unknown> | undefined => {
            const entry = refToEntry(subSchema.$ref, plan);
            if (!entry) return undefined;
            return (entry.schema as { properties?: Record<string, unknown> })
              .properties;
          })()
        : (subSchema as { properties?: Record<string, unknown> }).properties;
      if (isRecord(subProps)) {
        for (const [name, propSchema] of Object.entries(subProps)) {
          if (!isRecord(propSchema)) continue;
          addField(
            name,
            mapSchemaToTypeRef(propSchema as JsonSchema, plan, ctx),
            propSchema as JsonSchema,
          );
        }
      }
    }
  }

  // 2) Own properties.
  const props = (schema as { properties?: unknown }).properties;
  if (isRecord(props)) {
    for (const [name, propSchema] of Object.entries(props)) {
      if (!isRecord(propSchema)) continue;
      addField(
        name,
        mapSchemaToTypeRef(propSchema as JsonSchema, plan, ctx),
        propSchema as JsonSchema,
      );
    }
  }

  // 3) oneOf / anyOf.
  for (const combinator of ['oneOf', 'anyOf'] as const) {
    const arr = (schema as Record<string, unknown>)[combinator];
    if (!Array.isArray(arr)) continue;
    const discriminator = (schema as { discriminator?: unknown }).discriminator;
    if (
      isRecord(discriminator) &&
      typeof discriminator.propertyName === 'string'
    ) {
      // Tagged shape: kind TYPE string + one field per variant.
      addFieldRaw(fields, seen, 'kind', builtinType({ name: 'string' }));
      arr.forEach((sub, idx) => {
        if (!isRecord(sub)) return;
        const variantName = variantFieldName(sub as JsonSchema, idx);
        addFieldRaw(
          fields,
          seen,
          variantName,
          mapSchemaToTypeRef(sub as JsonSchema, plan, ctx),
        );
      });
    } else {
      // Fallback: variant_kind string + one field per candidate + _is_set flag.
      addFieldRaw(
        fields,
        seen,
        'variant_kind',
        builtinType({ name: 'string' }),
      );
      arr.forEach((sub, idx) => {
        if (!isRecord(sub)) return;
        const variantName = variantFieldName(sub as JsonSchema, idx);
        addFieldRaw(
          fields,
          seen,
          variantName,
          mapSchemaToTypeRef(sub as JsonSchema, plan, ctx),
        );
        addFieldRaw(
          fields,
          seen,
          `${variantName}_is_set`,
          builtinType({ name: 'abap_bool' }),
        );
      });
    }
  }

  // 4) additionalProperties escape hatch.
  const ap = (schema as { additionalProperties?: unknown })
    .additionalProperties;
  if (ap === true || isRecord(ap)) {
    const kvEntry = plan.byId.get('aux.kv');
    if (kvEntry) {
      addFieldRaw(
        fields,
        seen,
        '_extra',
        tableType({
          rowType: namedTypeRef({ name: kvEntry.abapName }),
          tableKind: 'hashed',
          uniqueness: 'unique',
          keyFields: ['key'],
        }),
      );
    }
  }

  return fields;
}

function addFieldRaw(
  fields: StructureField[],
  seen: Map<string, TypeRef>,
  rawName: string,
  type: TypeRef,
): void {
  const name = sanitizeIdent(rawName, 'param');
  if (seen.has(name)) return;
  seen.set(name, type);
  fields.push({ name, type });
}

function shallowTypeRefEqual(a: TypeRef, b: TypeRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'BuiltinType' && b.kind === 'BuiltinType') {
    return a.name === b.name;
  }
  if (a.kind === 'NamedTypeRef' && b.kind === 'NamedTypeRef') {
    return a.name === b.name;
  }
  return false;
}

function variantFieldName(sub: JsonSchema, idx: number): string {
  if (isRef(sub)) {
    const m = /^#\/components\/schemas\/(.+)$/.exec(sub.$ref);
    if (m) return m[1];
  }
  const title = (sub as { title?: unknown }).title;
  if (typeof title === 'string' && title) return title;
  return `variant_${idx}`;
}

/** Build a TypeDef node for a single plan entry. */
export function mapSchemaToTypeDef(
  entry: TypePlanEntry,
  plan: TypePlan,
): { typeDef: TypeDef; leadingComment?: Comment } {
  const schema = entry.schema;
  const ctx = { entryId: entry.id };

  // Enum shortcut: string with enum values.
  const enumValues = (schema as { enum?: unknown }).enum;
  const schemaType = pluckType(schema);
  if (
    Array.isArray(enumValues) &&
    (schemaType === 'string' || schemaType === undefined)
  ) {
    const members = buildEnumMembers(enumValues);
    if (members.length > 0) {
      return {
        typeDef: typeDef({
          name: entry.abapName,
          type: enumType({
            baseType: builtinType({ name: 'string' }),
            members,
          }),
        }),
      };
    }
  }

  // Array alias.
  if (schemaType === 'array') {
    const items = (schema as { items?: unknown }).items;
    const rowSchema: JsonSchema = isRecord(items) ? (items as JsonSchema) : {};
    return {
      typeDef: typeDef({
        name: entry.abapName,
        type: tableType({
          rowType: mapSchemaToTypeRef(rowSchema, plan, ctx),
          tableKind: 'standard',
        }),
      }),
    };
  }

  // Object / combinator.
  const hasObjectShape =
    schemaType === 'object' ||
    isRecord((schema as { properties?: unknown }).properties) ||
    Array.isArray((schema as { allOf?: unknown }).allOf) ||
    Array.isArray((schema as { oneOf?: unknown }).oneOf) ||
    Array.isArray((schema as { anyOf?: unknown }).anyOf);

  if (hasObjectShape) {
    const fields = buildStructureFields(schema, plan, ctx);
    const struct =
      fields.length > 0
        ? structureType({ fields })
        : structureType({
            fields: [
              {
                name: '_placeholder',
                type: builtinType({ name: 'string' }),
              },
            ],
          });
    const discriminator = (schema as { discriminator?: unknown }).discriminator;
    const leadingComment =
      Array.isArray((schema as { oneOf?: unknown }).oneOf) &&
      isRecord(discriminator)
        ? comment({
            text: ` Tagged union: only one variant field is populated at a time (kind discriminator).`,
            style: 'star',
          })
        : undefined;
    return {
      typeDef: typeDef({ name: entry.abapName, type: struct }),
      leadingComment,
    };
  }

  // Primitive alias.
  return {
    typeDef: typeDef({
      name: entry.abapName,
      type: builtinType({ name: mapPrimitive(schema) }),
    }),
  };
}
