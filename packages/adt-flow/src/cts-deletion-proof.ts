import { z } from 'zod';
import { compareStrings, digest } from './deterministic';
import { transportObjectInventoryEntrySchema } from './schemas';
import { AdtFlowError } from './types';

export type CtsDeletionInventoryEntry = z.infer<
  typeof transportObjectInventoryEntrySchema
>;

/** Minimal projection of existing CTS metadata; no source or provider policy. */
export interface CtsDeletionTransport {
  number: string;
  status: string;
  objectType: string;
  requestType?: string;
  objects: readonly Omit<CtsDeletionInventoryEntry, 'sourceTransport'>[];
}

export type CtsDeletionEvidence =
  | {
      kind: 'inventory';
      task: string;
      requestedTransports: readonly string[];
      inventory: readonly CtsDeletionInventoryEntry[];
    }
  | {
      kind: 'snapshot';
      requestedTransports: readonly string[];
      source: CtsDeletionTransport;
      snapshot: CtsDeletionTransport;
    };

export interface CtsDeletionProof {
  schemaVersion: 1;
  sourceTask: string;
  snapshotTransport: string;
  inventoryDigest: string;
  requestedTransports: string[];
  declarations: CtsDeletionInventoryEntry[];
}

function requireEvidence(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new AdtFlowError('invalid_input', message);
}

const TRANSPORT = /^[A-Z\d]{3}K\d{6}$/;
const transportSchema = z.object({
  number: z.string(),
  status: z.string(),
  objectType: z.string(),
  requestType: z.string().optional(),
  objects: z.array(
    transportObjectInventoryEntrySchema.omit({ sourceTransport: true }),
  ),
});
const evidenceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('inventory'),
    task: z.string(),
    requestedTransports: z.array(z.string()),
    inventory: z.array(transportObjectInventoryEntrySchema),
  }),
  z.object({
    kind: z.literal('snapshot'),
    requestedTransports: z.array(z.string()),
    source: transportSchema,
    snapshot: transportSchema,
  }),
]);

function validateScope(task: string, transports: readonly string[]): void {
  requireEvidence(TRANSPORT.test(task), 'Invalid deletion task identity.');
  requireEvidence(
    transports.length > 0 &&
      transports.at(-1) === task &&
      new Set(transports).size === transports.length &&
      transports.every(
        (value) =>
          TRANSPORT.test(value) && value.slice(0, 3) === task.slice(0, 3),
      ),
    'Deletion evidence must cover the latest task in one unambiguous system scope.',
  );
}

function normalizeInventory(
  rows: readonly CtsDeletionInventoryEntry[],
  task: string,
): CtsDeletionInventoryEntry[] {
  const unique = new Set<string>();
  return rows
    .map((row) => {
      const parsed = transportObjectInventoryEntrySchema.safeParse(row);
      requireEvidence(parsed.success, 'Invalid CTS deletion inventory entry.');
      requireEvidence(
        parsed.data.sourceTransport === task,
        'Deletion inventory belongs to another task.',
      );
      const entry = {
        ...parsed.data,
        pgmid: parsed.data.pgmid.trim().toUpperCase(),
        type: parsed.data.type.trim().toUpperCase(),
        name: parsed.data.name.trim().toUpperCase(),
        objFunc: parsed.data.objFunc.trim().toUpperCase(),
      };
      requireEvidence(
        /^[A-Z\d_]+$/.test(entry.pgmid) &&
          /^[A-Z\d_]+(?:\/[A-Z\d_]+)?$/.test(entry.type) &&
          entry.name &&
          [...entry.name].every((char) => {
            const code = char.codePointAt(0);
            return code !== undefined && code >= 32 && code !== 127;
          }),
        'Invalid CTS object identity.',
      );
      const key = JSON.stringify([entry.pgmid, entry.type, entry.name]);
      if (!(entry.pgmid === 'CORR' && entry.type === 'MERG')) {
        requireEvidence(!unique.has(key), 'Duplicate CTS inventory identity.');
        unique.add(key);
      }
      return entry;
    })
    .sort((a, b) =>
      compareStrings(
        JSON.stringify([a.pgmid, a.type, a.name]),
        JSON.stringify([b.pgmid, b.type, b.name]),
      ),
    );
}

function withoutControls(entries: readonly CtsDeletionInventoryEntry[]) {
  return entries.filter(
    (row) => !(row.pgmid === 'CORR' && row.type === 'MERG'),
  );
}

type ResolvedEvidence = {
  task: string;
  snapshotTransport: string;
  inventory: CtsDeletionInventoryEntry[];
};

function proofFromInventoryEvidence(
  evidence: Extract<CtsDeletionEvidence, { kind: 'inventory' }>,
): ResolvedEvidence {
  const task = evidence.task;
  validateScope(task, evidence.requestedTransports);
  return {
    task,
    snapshotTransport: task,
    inventory: withoutControls(normalizeInventory(evidence.inventory, task)),
  };
}

function assertSnapshotContract(
  source: CtsDeletionTransport,
  snapshot: CtsDeletionTransport,
  task: string,
): void {
  requireEvidence(
    source.objectType === 'T' && source.status === 'R',
    'Deletion source must be a released task.',
  );
  requireEvidence(
    TRANSPORT.test(snapshot.number) &&
      snapshot.number !== task &&
      snapshot.number.slice(0, 3) === task.slice(0, 3),
    'Deletion snapshot identity or system mismatch.',
  );
  requireEvidence(
    ['R', 'K'].includes(snapshot.objectType) &&
      snapshot.requestType === 'T' &&
      snapshot.status === 'R',
    'Deletion snapshot must be a released transport of copies.',
  );
}

function snapshotOrigin(
  copied: readonly CtsDeletionInventoryEntry[],
): string | undefined {
  const origins = copied
    .filter((row) => row.pgmid === 'CORR' && row.type === 'MERG')
    .map((row) => /^([A-Z\d]{3}K\d{6})(?:\s|$)/.exec(row.name)?.[1])
    .filter((origin): origin is string => origin !== undefined);
  return origins.length === 1 ? origins[0] : undefined;
}

function inventoryKeyDigest(
  entries: readonly CtsDeletionInventoryEntry[],
): string {
  return JSON.stringify(
    entries.map((row) => JSON.stringify([row.pgmid, row.type, row.name])),
  );
}

function proofFromSnapshotEvidence(
  evidence: Extract<CtsDeletionEvidence, { kind: 'snapshot' }>,
): ResolvedEvidence {
  const { source, snapshot } = evidence;
  const task = source.number;
  validateScope(task, evidence.requestedTransports);
  assertSnapshotContract(source, snapshot, task);
  const project = (transport: CtsDeletionTransport) =>
    normalizeInventory(
      transport.objects.map((row) => ({ ...row, sourceTransport: task })),
      task,
    );
  const original = withoutControls(project(source));
  const copied = project(snapshot);
  const origin = snapshotOrigin(copied);
  requireEvidence(
    origin === task,
    'Deletion snapshot origin is missing or ambiguous.',
  );
  const inventory = withoutControls(copied);
  requireEvidence(
    original.length > 0 &&
      inventoryKeyDigest(original) === inventoryKeyDigest(inventory),
    'Deletion snapshot inventory differs from its source task.',
  );
  return { task, snapshotTransport: snapshot.number, inventory };
}

/** Validate explicit deletion facts without acquiring source or mutating files. */
export function createCtsDeletionProof(
  evidence: CtsDeletionEvidence,
): CtsDeletionProof {
  const parsed = evidenceSchema.safeParse(evidence);
  requireEvidence(parsed.success, 'Invalid CTS deletion evidence.');
  const resolved =
    parsed.data.kind === 'inventory'
      ? proofFromInventoryEvidence(parsed.data)
      : proofFromSnapshotEvidence(parsed.data);
  return {
    schemaVersion: 1,
    sourceTask: resolved.task,
    snapshotTransport: resolved.snapshotTransport,
    inventoryDigest: digest(resolved.inventory),
    requestedTransports: [...parsed.data.requestedTransports],
    declarations: resolved.inventory.filter((row) => row.objFunc === 'D'),
  };
}
