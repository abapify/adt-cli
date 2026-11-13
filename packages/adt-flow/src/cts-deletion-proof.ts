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

const TRANSPORT = /^[A-Z0-9]{3}K[0-9]{6}$/;
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
        /^[A-Z0-9_]+$/.test(entry.pgmid) &&
          /^[A-Z0-9_]+(?:\/[A-Z0-9_]+)?$/.test(entry.type) &&
          entry.name &&
          [...entry.name].every(
            (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
          ),
        'Invalid CTS object identity.',
      );
      const key = JSON.stringify([entry.pgmid, entry.type, entry.name]);
      requireEvidence(!unique.has(key), 'Duplicate CTS inventory identity.');
      unique.add(key);
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

/** Validate explicit deletion facts without acquiring source or mutating files. */
export function createCtsDeletionProof(
  evidence: CtsDeletionEvidence,
): CtsDeletionProof {
  const parsed = evidenceSchema.safeParse(evidence);
  requireEvidence(parsed.success, 'Invalid CTS deletion evidence.');
  evidence = parsed.data;
  let task: string,
    snapshotTransport: string,
    inventory: CtsDeletionInventoryEntry[];
  if (evidence.kind === 'inventory') {
    task = evidence.task;
    validateScope(task, evidence.requestedTransports);
    inventory = withoutControls(normalizeInventory(evidence.inventory, task));
    snapshotTransport = task;
  } else if (evidence.kind === 'snapshot') {
    const { source, snapshot } = evidence;
    task = source.number;
    validateScope(task, evidence.requestedTransports);
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
    const project = (transport: CtsDeletionTransport) =>
      normalizeInventory(
        transport.objects.map((row) => ({ ...row, sourceTransport: task })),
        task,
      );
    const original = withoutControls(project(source));
    const copied = project(snapshot);
    const origins = copied
      .filter((row) => row.pgmid === 'CORR' && row.type === 'MERG')
      .map((row) => /^([A-Z0-9]{3}K[0-9]{6})(?:\s|$)/.exec(row.name)?.[1]);
    requireEvidence(
      origins.length === 1 && origins[0] === task,
      'Deletion snapshot origin is missing or ambiguous.',
    );
    inventory = withoutControls(copied);
    const keys = (entries: readonly CtsDeletionInventoryEntry[]) =>
      entries.map((row) => JSON.stringify([row.pgmid, row.type, row.name]));
    requireEvidence(
      original.length > 0 &&
        JSON.stringify(keys(original)) === JSON.stringify(keys(inventory)),
      'Deletion snapshot inventory differs from its source task.',
    );
    snapshotTransport = snapshot.number;
  } else {
    throw new AdtFlowError(
      'invalid_input',
      'Unknown CTS deletion evidence kind.',
    );
  }
  return {
    schemaVersion: 1,
    sourceTask: task,
    snapshotTransport,
    inventoryDigest: digest(inventory),
    requestedTransports: [...evidence.requestedTransports],
    declarations: inventory.filter((row) => row.objFunc === 'D'),
  };
}
