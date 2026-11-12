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

function normalizeUnit(
  raw: Record<string, unknown>,
  fallbackParent?: string,
): NormalizedCtsUnit {
  const parentRaw = raw.parent;
  const hasParent = typeof parentRaw === 'string' && parentRaw.trim() !== '';
  const parent = hasParent
    ? canonicalTransport(parentRaw as string)
    : fallbackParent;
  const kind: NormalizedCtsUnit['kind'] =
    parent === undefined ? 'request' : 'task';
  const description = raw.desc;
  const owner = raw.owner;
  const status = raw.status;
  const type = raw.type;
  const lastChangedTimestamp = raw.lastChangedTimestamp;
  return {
    kind,
    number: canonicalTransport(String(raw.number)),
    ...(parent === undefined ? {} : { parent }),
    ...(typeof description === 'string' ? { description } : {}),
    ...(typeof owner === 'string' ? { owner } : {}),
    ...(typeof status === 'string' ? { status } : {}),
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof lastChangedTimestamp === 'string'
      ? { lastChangedTimestamp }
      : {}),
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
  const requestedTransport = canonicalTransport(String(rawRecord.number));
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

/**
 * Ordered multi-root scope planning over requested transports. Pure and
 * deterministic: requested order wins, case-insensitive identities
 * deduplicate with provenance, a requested task whose parent is also
 * requested folds into that parent root instead of becoming a second root,
 * and systems stay separated. The caller's inputs are never mutated.
 */
export function planCtsScope(
  requests: ReadonlyArray<PlannedCtsScopeRequest>,
): PlannedCtsScope {
  const roots = new Map<string, PlannedCtsScopeRoot>();
  const payloadByRoot = new Map<string, NormalizedCtsInventory>();
  for (const request of requests) {
    const identity = canonicalTransport(request.transport);
    let root = roots.get(identity);
    if (!root) {
      root = {
        transport: identity,
        ...(request.system === undefined ? {} : { system: request.system }),
        tasks: [],
        requestedBy: [],
      };
      roots.set(identity, root);
      payloadByRoot.set(identity, request.normalized);
    }
    root.requestedBy.push(request.transport);
  }
  // A requested task whose parent is also requested folds into the parent.
  for (const [identity, root] of [...roots.entries()]) {
    const payload = payloadByRoot.get(identity);
    const unit = payload?.request;
    const parent = unit?.parent;
    if (!parent || unit?.kind !== 'task' || !roots.has(parent)) {
      continue;
    }
    const parentRoot = roots.get(parent);
    if (!parentRoot) {
      continue;
    }
    parentRoot.requestedBy.push(...root.requestedBy);
    for (const task of payload?.tasks ?? []) {
      if (
        task.number !== parentRoot.transport &&
        !parentRoot.tasks.includes(task.number)
      ) {
        parentRoot.tasks.push(task.number);
      }
    }
    roots.delete(identity);
    payloadByRoot.delete(identity);
  }
  // Expand each surviving root with the tasks of its own payload.
  for (const [identity] of roots.entries()) {
    const root = roots.get(identity);
    const payload = payloadByRoot.get(identity);
    if (!root || !payload) {
      continue;
    }
    for (const task of payload.tasks) {
      if (task.number !== root.transport && !root.tasks.includes(task.number)) {
        root.tasks.push(task.number);
      }
    }
  }
  const plannedRoots = [...roots.values()];
  const systems = [
    ...new Set(
      plannedRoots
        .map((root) => root.system)
        .filter((system): system is string => system !== undefined),
    ),
  ].sort();
  return {
    roots: plannedRoots,
    systems,
    requestedCount: requests.length,
  };
}
