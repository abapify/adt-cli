import type { JsonSchema, NormalizedSpec } from '../oas/index';
import { isRef } from '../oas/index';
import { makeNameAllocator } from './naming';
import { CyclicTypeError } from './errors';

export interface TypePlanEntry {
  /** Stable logical id, e.g. "components.schemas.Pet" or "components.schemas.Pet.properties.x". */
  readonly id: string;
  /** ABAP type name (ty_foo). */
  readonly abapName: string;
  /** Original JSON schema object. */
  readonly schema: JsonSchema;
  /** Logical ids of other plan entries this one depends on. */
  readonly dependencies: readonly string[];
  /** Where the entry comes from. */
  readonly source: 'component' | 'inline' | 'auxiliary';
  /** True when the entry participates in a self-reference (directly or indirectly via itself). */
  readonly selfReferential?: boolean;
}

export interface TypePlan {
  readonly entries: readonly TypePlanEntry[];
  readonly byId: ReadonlyMap<string, TypePlanEntry>;
}

export interface PlanTypesOptions {
  /** ABAP prefix applied to every emitted type name, e.g. "zps3_" → ty names become ty_zps3_pet. We use it as-is, joined with snake name. */
  typePrefix: string;
}

interface MutableEntry {
  id: string;
  abapName: string;
  schema: JsonSchema;
  dependencies: string[];
  source: 'component' | 'inline' | 'auxiliary';
  selfReferential?: boolean;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Extract component schema name from a $ref like "#/components/schemas/Pet". */
function componentNameFromRef(ref: string): string | undefined {
  const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
  return m ? m[1] : undefined;
}

/** Decide if a (non-ref) schema should get its own plan entry when encountered inline. */
function isNonTrivialInline(schema: JsonSchema): boolean {
  if (isRef(schema)) return false;
  const type = (schema as { type?: unknown }).type;
  const props = (schema as { properties?: unknown }).properties;
  if (type === 'object' || isRecord(props)) return isRecord(props);
  for (const c of ['allOf', 'oneOf', 'anyOf'] as const) {
    if (Array.isArray((schema as Record<string, unknown>)[c])) return true;
  }
  return false;
}

/** Walk a single schema (rooted at `rootId`) to collect:
 *  - direct dependencies on other entries (by id)
 *  - inline entries that must be allocated.
 *
 *  Descends into properties / items / combinators / additionalProperties.
 */
function collectFromSchema(
  rootId: string,
  rootSchema: JsonSchema,
  plannedIds: Set<string>,
  enqueueInline: (id: string, schema: JsonSchema) => void,
  schemaToId: Map<object, string>,
): string[] {
  const deps = new Set<string>();

  const visit = (schema: unknown, path: string[], atRoot: boolean): void => {
    if (!isRecord(schema)) return;
    if (isRef(schema)) {
      const name = componentNameFromRef(schema.$ref);
      if (name) {
        const depId = `components.schemas.${name}`;
        deps.add(depId);
      }
      return;
    }
    // Non-root: if this schema object IS one of the planned component schemas
    // (same reference — common after $ref dereferencing), treat as a dep and
    // stop descent.
    if (!atRoot) {
      const hitId = schemaToId.get(schema);
      if (hitId && hitId !== rootId) {
        deps.add(hitId);
        return;
      }
      if (hitId === rootId) {
        // Self-reference via identity.
        deps.add(rootId);
        return;
      }
    }
    // Non-root, non-ref, non-trivial object → allocate a dedicated inline entry.
    if (!atRoot && isNonTrivialInline(schema as JsonSchema)) {
      const id = `${rootId}.${path.join('.')}`;
      if (!plannedIds.has(id)) {
        enqueueInline(id, schema as JsonSchema);
        schemaToId.set(schema, id);
      }
      deps.add(id);
      return;
    }

    // Otherwise, keep descending to find refs / nested inline types.
    const rec = schema;
    if (isRecord(rec.properties)) {
      for (const [name, sub] of Object.entries(rec.properties)) {
        visit(sub, [...path, 'properties', name], false);
      }
    }
    if (rec.items !== undefined) {
      visit(rec.items, [...path, 'items'], false);
    }
    if (isRecord(rec.additionalProperties)) {
      visit(rec.additionalProperties, [...path, 'additionalProperties'], false);
    }
    for (const c of ['allOf', 'anyOf', 'oneOf'] as const) {
      const arr = rec[c];
      if (Array.isArray(arr)) {
        arr.forEach((sub, idx) => {
          visit(sub, [...path, c, String(idx)], false);
        });
      }
    }
  };

  visit(rootSchema, [], true);
  return [...deps];
}

/** Plan the ABAP type universe for a normalized spec. */
export function planTypes(
  spec: NormalizedSpec,
  opts: PlanTypesOptions,
): TypePlan {
  const used = new Set<string>();
  const alloc = makeNameAllocator(used);
  const entries: MutableEntry[] = [];
  const byId = new Map<string, MutableEntry>();
  const plannedIds = new Set<string>();
  const schemaToId = new Map<object, string>();
  const queue: Array<{
    id: string;
    schema: JsonSchema;
    source: MutableEntry['source'];
  }> = [];

  const enqueue = (
    id: string,
    schema: JsonSchema,
    source: MutableEntry['source'],
  ) => {
    if (plannedIds.has(id)) return;
    plannedIds.add(id);
    schemaToId.set(schema, id);
    queue.push({ id, schema, source });
  };

  // 1) Seed queue with named component schemas.
  for (const [name, schema] of Object.entries(spec.schemas)) {
    enqueue(`components.schemas.${name}`, schema, 'component');
  }

  // 2) Process queue; inline children discovered during collection will be
  //    appended here and processed in order.
  while (queue.length > 0) {
    const item = queue.shift()!;
    const rawName = inferRawName(item.id, item.source);
    const abapName = alloc(rawName, 'type', {
      prefix: 'ty_' + (opts.typePrefix ?? ''),
    });
    const entry: MutableEntry = {
      id: item.id,
      abapName,
      schema: item.schema,
      dependencies: [],
      source: item.source,
    };
    entries.push(entry);
    byId.set(item.id, entry);

    const deps = collectFromSchema(
      item.id,
      item.schema,
      plannedIds,
      (id, schema) => {
        enqueue(id, schema, 'inline');
      },
      schemaToId,
    );
    entry.dependencies = deps;
  }

  // 3) additionalProperties auxiliary: if any entry uses additionalProperties,
  //    register a shared ty_kv entry exactly once.
  const needsKv = entries.some((e) => hasOpenAdditional(e.schema));
  if (needsKv) {
    const kvId = 'aux.kv';
    const kvName = alloc('kv', 'type', {
      prefix: 'ty_' + (opts.typePrefix ?? ''),
    });
    const kvEntry: MutableEntry = {
      id: kvId,
      abapName: kvName,
      schema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
        },
      },
      dependencies: [],
      source: 'auxiliary',
    };
    entries.push(kvEntry);
    byId.set(kvId, kvEntry);
  }

  // 4) Topological sort with self-reference tolerance.
  const sorted = topoSort(entries);

  return {
    entries: Object.freeze(
      sorted.map((e) =>
        Object.freeze({
          ...e,
          dependencies: Object.freeze([...e.dependencies]),
        }),
      ),
    ),
    byId: new Map(
      sorted.map((e) => [
        e.id,
        {
          ...e,
          dependencies: Object.freeze([...e.dependencies]) as readonly string[],
        } as TypePlanEntry,
      ]),
    ),
  };
}

function hasOpenAdditional(schema: JsonSchema): boolean {
  const ap = (schema as Record<string, unknown>).additionalProperties;
  if (ap === true) return true;
  if (isRecord(ap)) return true;
  return false;
}

function inferRawName(id: string, source: MutableEntry['source']): string {
  if (source === 'component') {
    const m = /^components\.schemas\.(.+)$/.exec(id);
    return m ? m[1] : id;
  }
  if (source === 'auxiliary') {
    const m = /^aux\.(.+)$/.exec(id);
    return m ? m[1] : id;
  }
  // Inline: use last two path segments joined.
  const parts = id
    .split('.')
    .filter((p) => p && p !== 'properties' && p !== 'items');
  return parts.slice(-2).join('_') || id;
}

function topoSort(entries: MutableEntry[]): MutableEntry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out: MutableEntry[] = [];
  const state = new Map<string, 'white' | 'gray' | 'black'>();
  for (const e of entries) state.set(e.id, 'white');

  const visit = (id: string, stack: string[]): void => {
    const s = state.get(id);
    if (s === 'black') return;
    const entry = byId.get(id);
    if (!entry) return; // dependency points outside the plan (shouldn't happen)
    if (s === 'gray') {
      // Mark participants as self-referential.
      const cycleStart = stack.indexOf(id);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart) : [id];
      if (cycle.length === 1) {
        // simple self-reference — allow.
        entry.selfReferential = true;
        return;
      }
      // Mark all participants as self-referential (indirect cycle) and allow
      // — the emitter will insert a TYPE REF TO indirection for the back edge.
      for (const pid of cycle) {
        const ent = byId.get(pid);
        if (ent) ent.selfReferential = true;
      }
      return;
    }
    state.set(id, 'gray');
    stack.push(id);
    for (const dep of entry.dependencies) {
      if (dep === id) {
        entry.selfReferential = true;
        continue;
      }
      if (!byId.has(dep)) continue;
      const depState = state.get(dep);
      if (depState === 'gray') {
        // back-edge → mark cycle participants.
        const cycleStart = stack.indexOf(dep);
        const cycle = cycleStart >= 0 ? stack.slice(cycleStart) : [dep];
        for (const pid of [...cycle, id]) {
          const ent = byId.get(pid);
          if (ent) ent.selfReferential = true;
        }
        continue;
      }
      visit(dep, stack);
    }
    stack.pop();
    state.set(id, 'black');
    out.push(entry);
  };

  for (const e of entries) visit(e.id, []);
  // Sanity: every entry must be in `out`.
  if (out.length !== entries.length) {
    throw new CyclicTypeError(
      `planTypes: unable to topologically sort ${entries.length} entries (got ${out.length}).`,
    );
  }
  return out;
}
