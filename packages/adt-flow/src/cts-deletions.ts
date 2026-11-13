import { basename } from 'node:path';
import type { FlowConfig } from '@abapify/adt-config';
import type { FormatPlugin, ParsedFormatFilename } from '@abapify/adt-plugin';
import {
  createCtsDeletionProof,
  type CtsDeletionEvidence,
  type CtsDeletionProof,
} from './cts-deletion-proof';
import { compareStrings, sha256, stableJson } from './deterministic';
import {
  createTombstoneDescriptor,
  objectDescriptorPath,
  objectIdentity,
} from './identity';
import {
  applyRepositoryPlan,
  planRepositoryChanges,
  readRegularFile,
  safeRelativePath,
  walkFiles,
  type DesiredFile,
} from './repository';
import { objectDescriptorSchema, type ObjectDescriptor } from './schemas';
import { AdtFlowError, type FlowObjectIdentity } from './types';

export interface FlowDeletionInput {
  root: string;
  evidence: CtsDeletionEvidence;
  config: FlowConfig;
  dryRun?: boolean;
}

export interface FlowDeletionOperation {
  object: string;
  outcome: 'removed' | 'already_absent' | 'unapplied' | 'planned';
  paths: string[];
  alreadyAbsent: string[];
  diagnostic?:
    | 'CTS_DELETE_OWNERSHIP_NOT_PROVEN'
    | 'CTS_DELETE_COMPONENT_CHECKOUT_REQUIRED'
    | 'CTS_DELETE_TYPE_UNSUPPORTED'
    | 'CTS_DELETE_FILE_DIVERGED';
}

export interface FlowDeletionResult {
  schemaVersion: 1;
  proof: CtsDeletionProof;
  dryRun: boolean;
  planned: string[];
  removed: string[];
  operations: FlowDeletionOperation[];
}

function sourcePath(path: string): string {
  const safe = safeRelativePath(path);
  if (!safe.startsWith('src/'))
    throw new AdtFlowError(
      'path_invalid',
      'Deletion ownership must remain under src/.',
      { path },
    );
  return safe;
}

function matches(
  format: FormatPlugin,
  path: string,
  identity: FlowObjectIdentity,
): boolean {
  const parsed = format.parseFilename?.(basename(path));
  return (
    !!parsed &&
    parsed.type.toUpperCase() === identity.type &&
    parsed.name.toUpperCase().replaceAll('#', '/') === identity.name
  );
}

async function previousDescriptor(
  root: string,
  identity: FlowObjectIdentity,
): Promise<ObjectDescriptor | undefined> {
  const path = objectDescriptorPath(identity);
  const text = await readRegularFile(root, path);
  if (text === undefined) return undefined;
  const parsed = objectDescriptorSchema.safeParse(
    JSON.parse(text.toString('utf8')),
  );
  if (!parsed.success || parsed.data.identity.canonical !== identity.canonical)
    throw new AdtFlowError(
      'invalid_input',
      'Invalid deletion ownership descriptor.',
      { object: identity.canonical },
    );
  return parsed.data;
}

function startDeletionOperation(
  entry: CtsDeletionProof['declarations'][number],
): FlowDeletionOperation {
  return {
    object: `${entry.pgmid}/${entry.type}/${entry.name}`,
    outcome: 'unapplied',
    paths: [],
    alreadyAbsent: [],
  };
}

function classificationDiagnostic(
  entry: CtsDeletionProof['declarations'][number],
): FlowDeletionOperation['diagnostic'] | undefined {
  if (entry.type.includes('/')) return 'CTS_DELETE_TYPE_UNSUPPORTED';
  if (entry.pgmid === 'R3TR') return undefined;
  return entry.pgmid === 'LIMU'
    ? 'CTS_DELETE_COMPONENT_CHECKOUT_REQUIRED'
    : 'CTS_DELETE_TYPE_UNSUPPORTED';
}

function ownershipUnsupported(
  format: FormatPlugin,
  identity: FlowObjectIdentity,
  previous: ObjectDescriptor | undefined,
  matchingPaths: readonly string[],
): boolean {
  if (previous) return false;
  if (!format.parseFilename) return true;
  const supported = format.supportedTypes.some(
    (type) => type.toUpperCase() === identity.type,
  );
  return matchingPaths.length === 0 && !supported;
}

function ownedFileIndex(
  previous: ObjectDescriptor | undefined,
): Map<string, string> {
  return new Map(
    previous?.ownedFiles.map((file) => [sourcePath(file.path), file.hash]) ??
      [],
  );
}

function isRetainedPackageMetadata(
  identity: FlowObjectIdentity,
  parsed: ParsedFormatFilename,
  indexed: ReadonlyMap<string, string>,
  path: string,
): boolean {
  return (
    identity.type === 'DEVC' &&
    parsed.type.toUpperCase() === 'DEVC' &&
    parsed.name.toUpperCase() === 'PACKAGE' &&
    indexed.has(path)
  );
}

/** Observe candidate bytes; returns the owned file hashes or undefined when diverged. */
async function observeDeletionCandidates(
  input: FlowDeletionInput,
  format: FormatPlugin,
  identity: FlowObjectIdentity,
  candidates: readonly string[],
  indexed: ReadonlyMap<string, string>,
  operation: FlowDeletionOperation,
): Promise<Map<string, string> | undefined> {
  const files = new Map<string, string>();
  for (const path of candidates) {
    sourcePath(path);
    const content = await readRegularFile(input.root, path);
    if (content === undefined) {
      operation.alreadyAbsent.push(path);
      continue;
    }
    const hash = sha256(content);
    if (indexed.has(path) && indexed.get(path) !== hash) {
      operation.diagnostic = 'CTS_DELETE_FILE_DIVERGED';
      return undefined;
    }
    const parsed = format.parseFilename?.(basename(path));
    if (
      parsed &&
      !matches(format, path, identity) &&
      !isRetainedPackageMetadata(identity, parsed, indexed, path)
    ) {
      operation.diagnostic = 'CTS_DELETE_FILE_DIVERGED';
      return undefined;
    }
    files.set(path, hash);
  }
  return files;
}

function operationOutcome(
  input: FlowDeletionInput,
  files: ReadonlyMap<string, string>,
): FlowDeletionOperation['outcome'] {
  if (files.size === 0) return 'already_absent';
  return input.dryRun === true ? 'planned' : 'removed';
}

/** Accumulators shared by all declaration operations of one reconciliation. */
interface DeletionPlanContext {
  configDigest: string;
  formatDigest: string;
  desired: DesiredFile[];
  ownedPaths: Set<string>;
  expected: Map<string, string | null>;
}

async function processDeletionDeclaration(
  input: FlowDeletionInput,
  format: FormatPlugin,
  entry: CtsDeletionProof['declarations'][number],
  paths: readonly string[],
  context: DeletionPlanContext,
): Promise<FlowDeletionOperation> {
  const operation = startDeletionOperation(entry);
  const diagnostic = classificationDiagnostic(entry);
  if (diagnostic) {
    operation.diagnostic = diagnostic;
    return operation;
  }
  const identity = objectIdentity(entry);
  const previous = await previousDescriptor(input.root, identity);
  const matchingPaths = paths.filter((path) => matches(format, path, identity));
  if (ownershipUnsupported(format, identity, previous, matchingPaths)) {
    operation.diagnostic = 'CTS_DELETE_TYPE_UNSUPPORTED';
    return operation;
  }
  const indexed = ownedFileIndex(previous);
  const candidates = [...new Set([...indexed.keys(), ...matchingPaths])].sort(
    compareStrings,
  );
  if (identity.type === 'DEVC' && !previous && candidates.length === 0) {
    operation.diagnostic = 'CTS_DELETE_OWNERSHIP_NOT_PROVEN';
    return operation;
  }
  const files = await observeDeletionCandidates(
    input,
    format,
    identity,
    candidates,
    indexed,
    operation,
  );
  if (!files) return operation;
  operation.paths = [...files.keys()];
  operation.outcome = operationOutcome(input, files);
  for (const [path, hash] of files) {
    context.ownedPaths.add(path);
    context.expected.set(path, hash);
  }
  for (const path of operation.alreadyAbsent) context.expected.set(path, null);
  await appendTombstonePlan(input, identity, previous, context);
  return operation;
}

async function appendTombstonePlan(
  input: FlowDeletionInput,
  identity: FlowObjectIdentity,
  previous: ObjectDescriptor | undefined,
  context: DeletionPlanContext,
): Promise<void> {
  const descriptorPath = objectDescriptorPath(identity);
  const content = stableJson({
    ...createTombstoneDescriptor(
      identity,
      previous,
      context.configDigest,
      context.formatDigest,
    ),
    requiresInventoryRefresh: true,
  });
  const oldDescriptor = await readRegularFile(input.root, descriptorPath);
  context.desired.push({
    path: descriptorPath,
    content,
    role: 'metadata',
    owner: identity.canonical,
  });
  context.ownedPaths.add(descriptorPath);
  context.expected.set(
    descriptorPath,
    oldDescriptor === undefined ? null : sha256(oldDescriptor),
  );
}

async function assertUnchangedBytes(
  root: string,
  expected: ReadonlyMap<string, string | null>,
): Promise<void> {
  for (const [path, hash] of expected) {
    const content = await readRegularFile(root, path);
    if ((content === undefined ? null : sha256(content)) !== hash)
      throw new AdtFlowError(
        'working_tree_diverged',
        'Deletion evidence changed while planning.',
        { path },
      );
  }
}

/** Called within the service's shared workspace lock; no SAP acquisition. */
export async function reconcileCtsDeletions(
  input: FlowDeletionInput,
  format: FormatPlugin,
  configDigest: string,
  formatDigest: string,
): Promise<FlowDeletionResult> {
  const proof = createCtsDeletionProof(input.evidence);
  const paths = await walkFiles(input.root, 'src', true);
  const context: DeletionPlanContext = {
    configDigest,
    formatDigest,
    desired: [],
    ownedPaths: new Set<string>(),
    expected: new Map<string, string | null>(),
  };
  const operations: FlowDeletionOperation[] = [];
  for (const entry of proof.declarations) {
    operations.push(
      await processDeletionDeclaration(input, format, entry, paths, context),
    );
  }
  const plan = await planRepositoryChanges(
    input.root,
    context.desired,
    context.ownedPaths,
  );
  // Recheck bytes after all observations, before transactional mutation.
  await assertUnchangedBytes(input.root, context.expected);
  const planned = plan.removes.filter((path) => path.startsWith('src/'));
  if (!input.dryRun) await applyRepositoryPlan(input.root, plan);
  return {
    schemaVersion: 1,
    proof,
    dryRun: input.dryRun === true,
    planned,
    removed: input.dryRun ? [] : planned,
    operations,
  };
}
