import { z } from 'zod';
import { compareStrings } from './deterministic';
import {
  objectDescriptorSchema,
  transportObjectInventoryEntrySchema,
} from './schemas';
import { AdtFlowError, type FlowSkippedObject } from './types';

/**
 * Validated coverage assessment for a persisted checkout report.
 *
 * Pure contract: the caller supplies object descriptor payloads and verified
 * file evidence (path -> sha256, or an explicit null for verified absence).
 * The assessment neither reads the filesystem, nor runs Git, nor acquires
 * source, nor decides review policy. A report-storage failure is the
 * caller's boundary: it passes a missing report and receives `unknown`.
 */
export interface FlowCoverageAssessmentInput {
  report: unknown;
  descriptors: readonly unknown[];
  fileEvidence: ReadonlyMap<string, string | null>;
}

export interface FlowCoverageInventoryMapping {
  entries: number;
  mapped: number;
}

export interface FlowCoverageFiles {
  acquired: string[];
  deleted: string[];
  diverged: string[];
  unverified: string[];
}

export interface FlowCoverageAssessment {
  schemaVersion: 1;
  status: 'complete' | 'partial';
  mode: 'base' | 'head';
  requestedTransports: string[];
  scopeTransports: string[];
  indexedOnly: boolean;
  sourceExactness: 'verified' | 'unverified' | 'indexed-only';
  inventory: FlowCoverageInventoryMapping;
  files: FlowCoverageFiles;
  omissions: FlowSkippedObject[];
}

export type FlowCoverageUnknownReason = 'missing-report' | 'unsupported-report';

export interface FlowCoverageUnknownAssessment {
  schemaVersion: 1;
  status: 'unknown';
  reason: FlowCoverageUnknownReason;
}

export type FlowCoverageAssessmentResult =
  FlowCoverageAssessment | FlowCoverageUnknownAssessment;

const identitySchema = z.object({
  pgmid: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
});

const resolutionSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('resolved'),
    object: identitySchema,
    sourceTransport: z.string().min(1),
    repositoryObject: identitySchema,
  }),
  z.object({
    outcome: z.literal('non-source'),
    object: identitySchema,
    sourceTransport: z.string().min(1),
  }),
]);

const skippedSchema = z.object({
  object: z.string().min(1),
  component: z.string().min(1),
  diagnostic: z.string().min(1),
  sourceTransport: z.string().min(1).optional(),
});

const reportSchema = z.object({
  schemaVersion: z.literal(1),
  coverageVersion: z.literal(1),
  mode: z.enum(['base', 'head']),
  requestedTransports: z.array(z.string().min(1)),
  scopeTransports: z.array(z.string().min(1)),
  descriptors: z.array(z.string().min(1)),
  indexedOnly: z.boolean(),
  skipped: z.array(skippedSchema),
  inventory: z.array(transportObjectInventoryEntrySchema).optional(),
  inventoryResolutions: z.array(resolutionSchema).optional(),
  absentObjects: z.array(z.string().min(1)).optional(),
  derived: z.array(skippedSchema).optional(),
});

type CoverageReport = z.infer<typeof reportSchema>;

type Descriptor = z.infer<typeof objectDescriptorSchema>;

const omitted = (
  object: string,
  component: string,
  diagnostic: string,
  sourceTransport?: string,
): FlowSkippedObject => ({
  object,
  component,
  diagnostic,
  ...(sourceTransport === undefined ? {} : { sourceTransport }),
});

const categoryOrder = {
  absent: 0,
  skipped: 1,
  unmapped: 2,
  derived: 3,
  diverged: 4,
} as const;

function canonicalIdentity(identity: {
  pgmid: string;
  type: string;
  name: string;
}): string {
  return `${identity.pgmid}/${identity.type}/${identity.name}`;
}

function requireHashEvidence(
  evidence: ReadonlyMap<string, string | null>,
  path: string,
): string | null | undefined {
  if (!evidence.has(path)) return undefined;
  const hash = evidence.get(path);
  if (
    hash !== null &&
    (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
  ) {
    throw new AdtFlowError('invalid_input', 'Invalid coverage file hash.', {
      path,
    });
  }
  return hash ?? null;
}

function assertUniqueOwnedPaths(descriptor: Descriptor): void {
  const paths = new Set<string>();
  for (const file of descriptor.ownedFiles) {
    const portablePath = file.path.toLowerCase();
    if (paths.has(portablePath)) {
      throw new AdtFlowError(
        'path_collision',
        'Duplicate owned path in flow descriptor.',
        { path: file.path },
      );
    }
    paths.add(portablePath);
  }
}

function parseDescriptors(values: readonly unknown[]): Descriptor[] {
  return values.map((value) => {
    const parsed = objectDescriptorSchema.safeParse(value);
    if (!parsed.success) {
      throw new AdtFlowError(
        'invalid_input',
        'A flow descriptor uses an unsupported or invalid schema.',
        { issues: parsed.error.issues },
      );
    }
    assertUniqueOwnedPaths(parsed.data);
    return parsed.data;
  });
}

function parseReport(report: unknown): CoverageReport | undefined {
  if (report === undefined) return undefined;
  if (report === null || typeof report !== 'object') return undefined;
  const parsed = reportSchema.safeParse(report);
  return parsed.success ? parsed.data : undefined;
}

function mapInventory(
  report: CoverageReport,
  descriptors: readonly Descriptor[],
): { counts: FlowCoverageInventoryMapping; unmapped: FlowSkippedObject[] } {
  const byIdentity = new Set(
    descriptors.map((descriptor) => descriptor.identity.canonical),
  );
  const claimed = new Set<string>();
  const resolutions = new Map(
    (report.inventoryResolutions ?? [])
      .filter((row) => row.outcome === 'resolved')
      .map((row) => [canonicalIdentity(row.object), row.repositoryObject]),
  );
  const skippedKeys = new Set(
    [...report.skipped, ...(report.derived ?? [])].flatMap((row) => [
      row.object.toUpperCase(),
      `R3TR/${row.object.toUpperCase()}`,
    ]),
  );
  const absent = new Set((report.absentObjects ?? []).map((row) => row));
  const inventory = report.inventory ?? [];
  const unmapped: FlowSkippedObject[] = [];
  let mapped = 0;
  for (const entry of inventory) {
    const identity = canonicalIdentity(entry);
    const owner = resolutions.get(identity);
    if (
      byIdentity.has(identity) ||
      (owner && byIdentity.has(canonicalIdentity(owner))) ||
      absent.has(identity) ||
      skippedKeys.has(identity.toUpperCase())
    ) {
      claimed.add(identity);
      if (owner) claimed.add(canonicalIdentity(owner));
      mapped += 1;
      continue;
    }
    unmapped.push(
      omitted(
        identity,
        'object',
        'COVERAGE_OWNERSHIP_UNMAPPED',
        entry.sourceTransport,
      ),
    );
  }
  for (const descriptor of descriptors) {
    if (!claimed.has(descriptor.identity.canonical)) {
      unmapped.push(
        omitted(
          descriptor.identity.canonical,
          'object',
          'COVERAGE_OWNERSHIP_UNINVENTORIED',
        ),
      );
    }
  }
  return {
    counts: { entries: inventory.length, mapped },
    unmapped,
  };
}

function classifyFiles(
  descriptors: readonly Descriptor[],
  evidence: ReadonlyMap<string, string | null>,
): { files: FlowCoverageFiles; divergences: FlowSkippedObject[] } {
  const files: FlowCoverageFiles = {
    acquired: [],
    deleted: [],
    diverged: [],
    unverified: [],
  };
  const divergences: FlowSkippedObject[] = [];
  for (const descriptor of descriptors) {
    for (const file of descriptor.ownedFiles) {
      const hash = requireHashEvidence(evidence, file.path);
      if (hash === undefined) {
        files.unverified.push(file.path);
        continue;
      }
      if (hash === null) {
        files.deleted.push(file.path);
        continue;
      }
      if (hash === file.hash) {
        files.acquired.push(file.path);
        continue;
      }
      files.diverged.push(file.path);
      divergences.push(
        omitted(
          descriptor.identity.canonical,
          file.role === 'source' ? file.sourceComponent : file.role,
          'COVERAGE_FILE_DIVERGED',
        ),
      );
    }
  }
  return { files, divergences };
}

function sortOmissions(rows: FlowSkippedObject[]): FlowSkippedObject[] {
  return rows
    .map((row) => ({ row, category: categoryIndex(row) }))
    .sort(
      (a, b) =>
        a.category - b.category ||
        compareStrings(a.row.object, b.row.object) ||
        compareStrings(a.row.component, b.row.component) ||
        compareStrings(a.row.diagnostic, b.row.diagnostic) ||
        compareStrings(
          a.row.sourceTransport ?? '',
          b.row.sourceTransport ?? '',
        ),
    )
    .map((entry) => entry.row);
}

function categoryIndex(row: FlowSkippedObject): number {
  switch (row.diagnostic) {
    case 'COVERAGE_ABSENT_OBJECT':
      return categoryOrder.absent;
    case 'COVERAGE_OWNERSHIP_UNINVENTORIED':
    case 'COVERAGE_OWNERSHIP_UNMAPPED':
      return categoryOrder.unmapped;
    case 'COVERAGE_FILE_DIVERGED':
      return categoryOrder.diverged;
    case 'SOURCE_COMPONENT_SCOPE_DERIVED':
      return categoryOrder.derived;
    default:
      return categoryOrder.skipped;
  }
}

/**
 * Assess persisted checkout coverage. Missing or unsupported reports resolve
 * to `unknown`; everything else is validated and classified from typed
 * omissions. This function neither proves Git history nor authorizes
 * mutation.
 */
export function assessFlowCheckoutCoverage(
  input: FlowCoverageAssessmentInput,
): FlowCoverageAssessmentResult {
  const parsed = parseReport(input.report);
  if (parsed === undefined) {
    return {
      schemaVersion: 1,
      status: 'unknown',
      reason:
        input.report === undefined ? 'missing-report' : 'unsupported-report',
    };
  }
  const descriptors = parseDescriptors(input.descriptors);
  const mapping = mapInventory(parsed, descriptors);
  const { files, divergences } = parsed.indexedOnly
    ? {
        files: {
          acquired: [],
          deleted: [],
          diverged: [],
          unverified: [],
        } as FlowCoverageFiles,
        divergences: [] as FlowSkippedObject[],
      }
    : classifyFiles(descriptors, input.fileEvidence);
  const omissions = sortOmissions([
    ...(parsed.absentObjects ?? []).map((object) =>
      omitted(object, 'object', 'COVERAGE_ABSENT_OBJECT'),
    ),
    ...parsed.skipped,
    ...mapping.unmapped,
    ...(parsed.derived ?? []),
    ...divergences,
  ]);
  const sourceExactness = parsed.indexedOnly
    ? ('indexed-only' as const)
    : files.unverified.length
      ? ('unverified' as const)
      : ('verified' as const);
  const status: 'complete' | 'partial' =
    omissions.length === 0 &&
    files.diverged.length === 0 &&
    (parsed.indexedOnly || files.unverified.length === 0)
      ? 'complete'
      : 'partial';
  return {
    schemaVersion: 1,
    status,
    mode: parsed.mode,
    requestedTransports: [...parsed.requestedTransports],
    scopeTransports: [...parsed.scopeTransports],
    indexedOnly: parsed.indexedOnly,
    sourceExactness,
    inventory: mapping.counts,
    files: {
      acquired: files.acquired.slice().sort(compareStrings),
      deleted: files.deleted.slice().sort(compareStrings),
      diverged: files.diverged.slice().sort(compareStrings),
      unverified: files.unverified.slice().sort(compareStrings),
    },
    omissions,
  };
}
