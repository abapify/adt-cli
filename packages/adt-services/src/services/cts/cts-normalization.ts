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
type PlannedRoots = Map<string, PlannedCtsScopeRoot>;

interface PlannedRootPayloads {
  roots: PlannedRoots;
  payloads: Map<string, NormalizedCtsInventory>;
}

function collectRoots(
  requests: ReadonlyArray<PlannedCtsScopeRequest>,
): PlannedRootPayloads {
  const roots: PlannedRoots = new Map();
  const payloads = new Map<string, NormalizedCtsInventory>();
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
      payloads.set(identity, request.normalized);
    }
    root.requestedBy.push(request.transport);
  }
  return { roots, payloads };
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
  identity: string,
  payloads: PlannedRootPayloads,
): PlannedCtsScopeRoot | undefined {
  const unit = payloads.payloads.get(identity)?.request;
  if (unit?.kind !== 'task') {
    return undefined;
  }
  const parent = unit.parent;
  if (parent === undefined || !payloads.roots.has(parent)) {
    return undefined;
  }
  return payloads.roots.get(parent);
}

function foldIntoParent(
  identity: string,
  root: PlannedCtsScopeRoot,
  parentRoot: PlannedCtsScopeRoot,
  payloads: PlannedRootPayloads,
): void {
  parentRoot.requestedBy.push(...root.requestedBy);
  for (const task of payloads.payloads.get(identity)?.tasks ?? []) {
    appendTask(parentRoot.tasks, task.number, parentRoot);
  }
  payloads.roots.delete(identity);
  payloads.payloads.delete(identity);
}

/**
 * A requested task whose parent is also requested folds into the parent root
 * and takes its request provenance with it.
 */
function foldTaskRootsIntoParents(payloads: PlannedRootPayloads): void {
  for (const [identity, root] of [...payloads.roots.entries()]) {
    const parentRoot = foldTargetOf(identity, payloads);
    if (parentRoot) {
      foldIntoParent(identity, root, parentRoot, payloads);
    }
  }
}

function expandRootTasks(payloads: PlannedRootPayloads): void {
  for (const [identity, root] of payloads.roots.entries()) {
    const payload = payloads.payloads.get(identity);
    if (!payload) {
      continue;
    }
    for (const task of payload.tasks) {
      appendTask(root.tasks, task.number, root);
    }
  }
}

function collectSystems(roots: PlannedRoots): string[] {
  return [
    ...new Set(
      [...roots.values()]
        .map((root) => root.system)
        .filter((system): system is string => system !== undefined),
    ),
  ].sort();
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
  const payloads = collectRoots(requests);
  foldTaskRootsIntoParents(payloads);
  expandRootTasks(payloads);
  const roots = [...payloads.roots.values()];
  return {
    roots,
    systems: collectSystems(payloads.roots),
    requestedCount: requests.length,
  };
}
