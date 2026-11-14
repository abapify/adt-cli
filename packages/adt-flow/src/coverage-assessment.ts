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

const FILE_HASH = /^[a-f0-9]{64}$/;

function requireHashEvidence(
  evidence: ReadonlyMap<string, string | null>,
  path: string,
): string | null | undefined {
  if (!evidence.has(path)) return undefined;
  const hash = evidence.get(path);
  if (hash === null) return null;
  if (typeof hash !== 'string' || !FILE_HASH.test(hash)) {
    throw new AdtFlowError('invalid_input', 'Invalid coverage file hash.', {
      path,
    });
  }
  return hash;
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

function ownerLookup(
  report: CoverageReport,
  descriptors: readonly Descriptor[],
) {
  return {
    byIdentity: new Set(
      descriptors.map((descriptor) => descriptor.identity.canonical),
    ),
    resolutions: new Map(
      (report.inventoryResolutions ?? [])
        .filter((row) => row.outcome === 'resolved')
        .map((row) => [canonicalIdentity(row.object), row.repositoryObject]),
    ),
    skippedKeys: new Set(
      [...report.skipped, ...(report.derived ?? [])].flatMap((row) => [
        row.object.toUpperCase(),
        `R3TR/${row.object.toUpperCase()}`,
      ]),
    ),
    absent: new Set((report.absentObjects ?? []).map((row) => row)),
  };
}

type OwnerLookup = ReturnType<typeof ownerLookup>;

function resolvedOwnership(
  entry: { pgmid: string; type: string; name: string },
  lookup: OwnerLookup,
): string | undefined {
  const identity = canonicalIdentity(entry);
  if (lookup.byIdentity.has(identity)) return identity;
  const owner = lookup.resolutions.get(identity);
  if (owner === undefined) return undefined;
  const ownerIdentity = canonicalIdentity(owner);
  return lookup.byIdentity.has(ownerIdentity) ? ownerIdentity : undefined;
}

function inventoryCoverage(
  entry: { pgmid: string; type: string; name: string },
  lookup: OwnerLookup,
): 'claimed' | 'absent' | 'skipped' | 'unmapped' {
  const identity = canonicalIdentity(entry);
  if (resolvedOwnership(entry, lookup) !== undefined) return 'claimed';
  if (lookup.absent.has(identity)) return 'absent';
  if (lookup.skippedKeys.has(identity.toUpperCase())) return 'skipped';
  return 'unmapped';
}

function mapInventory(
  report: CoverageReport,
  descriptors: readonly Descriptor[],
): {
  counts: FlowCoverageInventoryMapping;
  unmapped: FlowSkippedObject[];
  claimed: Set<string>;
} {
  const lookup = ownerLookup(report, descriptors);
  const inventory = report.inventory ?? [];
  const unmapped: FlowSkippedObject[] = [];
  const claimed = new Set<string>();
  let mapped = 0;
  for (const entry of inventory) {
    if (inventoryCoverage(entry, lookup) === 'unmapped') {
      unmapped.push(
        omitted(
          canonicalIdentity(entry),
          'object',
          'COVERAGE_OWNERSHIP_UNMAPPED',
          entry.sourceTransport,
        ),
      );
      continue;
    }
    claimed.add(canonicalIdentity(entry));
    const owner = lookup.resolutions.get(canonicalIdentity(entry));
    if (owner) claimed.add(canonicalIdentity(owner));
    mapped += 1;
  }
  return { counts: { entries: inventory.length, mapped }, unmapped, claimed };
}

function uninventoriedDescriptors(
  descriptors: readonly Descriptor[],
  claimed: ReadonlySet<string>,
): FlowSkippedObject[] {
  return descriptors
    .filter((descriptor) => !claimed.has(descriptor.identity.canonical))
    .map((descriptor) =>
      omitted(
        descriptor.identity.canonical,
        'object',
        'COVERAGE_OWNERSHIP_UNINVENTORIED',
      ),
    );
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
  const sortedFiles: FlowCoverageFiles = {
    acquired: files.acquired.sort(compareStrings),
    deleted: files.deleted.sort(compareStrings),
    diverged: files.diverged.sort(compareStrings),
    unverified: files.unverified.sort(compareStrings),
  };
  return { files: sortedFiles, divergences };
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
  if (parsed === undefined) return unknownAssessment(input.report);
  return assessValidatedReport(parsed, input);
}

function unknownAssessment(report: unknown): FlowCoverageUnknownAssessment {
  return {
    schemaVersion: 1,
    status: 'unknown',
    reason: report === undefined ? 'missing-report' : 'unsupported-report',
  };
}

function assessValidatedReport(
  parsed: CoverageReport,
  input: FlowCoverageAssessmentInput,
): FlowCoverageAssessment {
  const descriptors = parseDescriptors(input.descriptors);
  const mapping = mapInventory(parsed, descriptors);
  const { files, divergences } = coverageFiles(parsed, descriptors, input);
  const omissions = sortOmissions([
    ...(parsed.absentObjects ?? []).map((object) =>
      omitted(object, 'object', 'COVERAGE_ABSENT_OBJECT'),
    ),
    ...parsed.skipped,
    ...mapping.unmapped,
    ...uninventoriedDescriptors(descriptors, mapping.claimed),
    ...(parsed.derived ?? []),
    ...divergences,
  ]);
  const sourceExactness = parsed.indexedOnly
    ? ('indexed-only' as const)
    : files.unverified.length
      ? ('unverified' as const)
      : ('verified' as const);
  return {
    schemaVersion: 1,
    status: coverageStatus(parsed, files, omissions),
    mode: parsed.mode,
    requestedTransports: [...parsed.requestedTransports],
    scopeTransports: [...parsed.scopeTransports],
    indexedOnly: parsed.indexedOnly,
    sourceExactness,
    inventory: mapping.counts,
    files,
    omissions,
  };
}

function coverageFiles(
  parsed: CoverageReport,
  descriptors: readonly Descriptor[],
  input: FlowCoverageAssessmentInput,
): { files: FlowCoverageFiles; divergences: FlowSkippedObject[] } {
  if (parsed.indexedOnly) {
    return {
      files: { acquired: [], deleted: [], diverged: [], unverified: [] },
      divergences: [],
    };
  }
  return classifyFiles(descriptors, input.fileEvidence);
}

function coverageStatus(
  parsed: CoverageReport,
  files: FlowCoverageFiles,
  omissions: readonly FlowSkippedObject[],
): 'complete' | 'partial' {
  return omissions.length === 0 &&
    files.diverged.length === 0 &&
    (parsed.indexedOnly || files.unverified.length === 0)
    ? 'complete'
    : 'partial';
}
