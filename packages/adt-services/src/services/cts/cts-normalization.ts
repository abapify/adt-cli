import type { Transport } from '@abapify/adt-client';

/** A raw CTS field the projection does not map, kept with its provenance. */
export interface UnsupportedCtsField {
  field: string;
  value: unknown;
}

export interface NormalizedCtsUnit {
  kind: 'request' | 'task';
  number: string;
  parent?: string;
  description?: string;
  owner?: string;
  status?: string;
  type?: string;
  target?: string;
  lastChangedTimestamp?: string;
  unsupportedFields: UnsupportedCtsField[];
}

export interface NormalizedCtsInventory {
  requestedTransport: string;
  /** The first normalized unit: a request, or the requested task itself. */
  request?: NormalizedCtsUnit;
  tasks: NormalizedCtsUnit[];
  units: NormalizedCtsUnit[];
}

export interface PlannedCtsScopeRoot {
  transport: string;
  system?: string;
  tasks: string[];
  /** Every original request spelling that resolved to this root. */
  requestedBy: string[];
}

export interface PlannedCtsScope {
  roots: PlannedCtsScopeRoot[];
  systems: string[];
  requestedCount: number;
}

const KNOWN_UNIT_FIELDS: ReadonlySet<string> = new Set([
  'number',
  'desc',
  'owner',
  'status',
  'type',
  'target',
  'parent',
  'lastChangedTimestamp',
  'tasks',
]);

function canonicalTransport(value: string): string {
  return value.trim().toUpperCase();
}

function unsupportedFieldsOf(
  raw: Record<string, unknown>,
): UnsupportedCtsField[] {
  return Object.entries(raw)
    .filter(([field]) => !KNOWN_UNIT_FIELDS.has(field))
    .map(([field, value]) => ({ field, value }));
}

function normalizedParent(
  raw: Record<string, unknown>,
  fallbackParent?: string,
): string | undefined {
  const parentRaw = raw.parent;
  if (typeof parentRaw === 'string' && parentRaw.trim() !== '') {
    return canonicalTransport(parentRaw);
  }
  return fallbackParent;
}

function optionalUnitFields(raw: Record<string, unknown>) {
  return {
    ...(typeof raw.desc === 'string' ? { description: raw.desc } : {}),
    ...(typeof raw.owner === 'string' ? { owner: raw.owner } : {}),
    ...(typeof raw.status === 'string' ? { status: raw.status } : {}),
    ...(typeof raw.type === 'string' ? { type: raw.type } : {}),
    ...(typeof raw.target === 'string' ? { target: raw.target } : {}),
    ...(typeof raw.lastChangedTimestamp === 'string'
      ? { lastChangedTimestamp: raw.lastChangedTimestamp }
      : {}),
  };
}

function normalizeUnit(
  raw: Record<string, unknown>,
  fallbackParent?: string,
): NormalizedCtsUnit {
  const parent = normalizedParent(raw, fallbackParent);
  return {
    kind: parent === undefined ? 'request' : 'task',
    number: canonicalTransport(String(raw.number)),
    ...(parent === undefined ? {} : { parent }),
    ...optionalUnitFields(raw),
    unsupportedFields: unsupportedFieldsOf(raw),
  };
}

/**
 * Generic request/task normalization over the raw CTS transport payload.
 * Pure: unknown fields are retained as unsupported provenance, missing
 * metadata stays missing, and parent identities are canonicalized
 * case-insensitively. The caller's input object is never mutated.
 */
export function normalizeCtsTransport(raw: Transport): NormalizedCtsInventory {
  const rawRecord = raw as unknown as Record<string, unknown>;
  if (typeof rawRecord.number !== 'string' || rawRecord.number.trim() === '') {
    throw new Error('Transport number is required');
  }
  const requestedTransport = canonicalTransport(rawRecord.number);
  const rawTasks = Array.isArray(rawRecord.tasks)
    ? (rawRecord.tasks as Array<Record<string, unknown>>)
    : [];
  const request = normalizeUnit(rawRecord);
  if (rawTasks.length === 0) {
    return {
      requestedTransport,
      request,
      tasks: [],
      units: [request],
    };
  }
  const tasks = rawTasks.map((task) => normalizeUnit(task, request.number));
  return {
    requestedTransport,
    request,
    tasks,
    units: [request, ...tasks],
  };
}

export interface PlannedCtsScopeRequest {
  transport: string;
  system?: string;
  normalized: NormalizedCtsInventory;
}

interface RootKey {
  system: string | undefined;
  transport: string;
}

function rootKey(key: RootKey): string {
  return JSON.stringify([key.system ?? null, key.transport]);
}

interface RootBuilder {
  root: PlannedCtsScopeRoot;
  payload: NormalizedCtsInventory;
  /** First requested position; folding keeps the earliest position. */
  order: number;
  /** Requested spellings with their original positions, for provenance. */
  origins: Array<{ spelling: string; index: number }>;
}

interface PlannedRoots {
  roots: Map<string, RootBuilder>;
}

function collectRoots(
  requests: ReadonlyArray<PlannedCtsScopeRequest>,
): PlannedRoots {
  const roots = new Map<string, RootBuilder>();
  requests.forEach((request, index) => {
    const identity = canonicalTransport(request.transport);
    const key = rootKey({ system: request.system, transport: identity });
    let builder = roots.get(key);
    if (!builder) {
      builder = {
        root: {
          transport: identity,
          ...(request.system === undefined ? {} : { system: request.system }),
          tasks: [],
          requestedBy: [],
        },
        payload: request.normalized,
        order: index,
        origins: [],
      };
      roots.set(key, builder);
    } else if (
      JSON.stringify(request.normalized.units) !==
      JSON.stringify(builder.payload.units)
    ) {
      throw new Error(
        `Conflicting normalized payloads for transport ${identity}.`,
      );
    }
    builder.origins.push({ spelling: request.transport, index });
  });
  return { roots };
}

function appendTask(
  tasks: string[],
  taskNumber: string,
  root: PlannedCtsScopeRoot,
): void {
  if (taskNumber !== root.transport && !tasks.includes(taskNumber)) {
    tasks.push(taskNumber);
  }
}

function foldTargetOf(
  key: string,
  payloads: PlannedRoots,
): RootBuilder | undefined {
  const unit = payloads.roots.get(key)?.payload.request;
  if (unit?.kind !== 'task') {
    return undefined;
  }
  const parent = unit.parent;
  if (parent === undefined) {
    return undefined;
  }
  const system = payloads.roots.get(key)?.root.system;
  return payloads.roots.get(rootKey({ system, transport: parent }));
}

function foldIntoParent(
  key: string,
  folded: RootBuilder,
  parent: RootBuilder,
  payloads: PlannedRoots,
): void {
  parent.origins.push(...folded.origins);
  parent.order = Math.min(parent.order, folded.order);
  appendTask(parent.root.tasks, folded.root.transport, parent.root);
  for (const task of folded.payload.tasks) {
    appendTask(parent.root.tasks, task.number, parent.root);
  }
  payloads.roots.delete(key);
}

/**
 * A requested task whose parent is also requested in the same system folds
 * into the parent root and takes its request provenance with it.
 */
function foldTaskRootsIntoParents(payloads: PlannedRoots): void {
  for (const [key, folded] of [...payloads.roots.entries()]) {
    const parent = foldTargetOf(key, payloads);
    if (parent) {
      foldIntoParent(key, folded, parent, payloads);
    }
  }
}

function expandRootTasks(payloads: PlannedRoots): void {
  for (const builder of payloads.roots.values()) {
    for (const task of builder.payload.tasks) {
      appendTask(builder.root.tasks, task.number, builder.root);
    }
  }
}

/**
 * Ordered multi-root scope planning over requested transports. Pure and
 * deterministic: requested order wins, identities are scoped per system,
 * case-insensitive duplicates deduplicate with provenance, a requested task
 * whose parent is also requested folds into that parent root, root task
 * lists are sorted by transport number, and systems stay separated. The
 * caller's inputs are never mutated.
 */
export function planCtsScope(
  requests: ReadonlyArray<PlannedCtsScopeRequest>,
): PlannedCtsScope {
  const payloads = collectRoots(requests);
  foldTaskRootsIntoParents(payloads);
  expandRootTasks(payloads);
  const ordered = [...payloads.roots.values()].sort(
    (a, b) => a.order - b.order,
  );
  for (const builder of ordered) {
    builder.root.tasks.sort(compareTransports);
    builder.root.requestedBy = builder.origins
      .sort((a, b) => a.index - b.index)
      .map(({ spelling }) => spelling);
  }
  const systems = [
    ...new Set(
      ordered
        .map((builder) => builder.root.system)
        .filter((system): system is string => system !== undefined),
    ),
  ].sort();
  return {
    roots: ordered.map((builder) => builder.root),
    systems,
    requestedCount: requests.length,
  };
}

function compareTransports(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'variant' });
}
