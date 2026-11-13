import { basename } from 'node:path';
import type { FlowConfig } from '@abapify/adt-config';
import type { FormatPlugin } from '@abapify/adt-plugin';
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
  readText,
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

/** Called within the service's shared workspace lock; no SAP acquisition. */
export async function reconcileCtsDeletions(
  input: FlowDeletionInput,
  format: FormatPlugin,
  configDigest: string,
  formatDigest: string,
): Promise<FlowDeletionResult> {
  const proof = createCtsDeletionProof(input.evidence);
  const paths = await walkFiles(input.root, 'src', true);
  const desired: DesiredFile[] = [];
  const ownedPaths = new Set<string>();
  const expected = new Map<string, string | null>();
  const operations: FlowDeletionOperation[] = [];
  for (const entry of proof.declarations) {
    const identity = objectIdentity(entry);
    const operation: FlowDeletionOperation = {
      object: `${entry.pgmid}/${entry.type}/${entry.name}`,
      outcome: 'unapplied',
      paths: [],
      alreadyAbsent: [],
    };
    operations.push(operation);
    if (entry.type.includes('/')) {
      operation.diagnostic = 'CTS_DELETE_TYPE_UNSUPPORTED';
      continue;
    }
    if (entry.pgmid !== 'R3TR') {
      operation.diagnostic =
        entry.pgmid === 'LIMU'
          ? 'CTS_DELETE_COMPONENT_CHECKOUT_REQUIRED'
          : 'CTS_DELETE_TYPE_UNSUPPORTED';
      continue;
    }
    const previous = await previousDescriptor(input.root, identity);
    const matchingPaths = paths.filter((path) =>
      matches(format, path, identity),
    );
    if (
      !previous &&
      (!format.parseFilename ||
        (matchingPaths.length === 0 &&
          !format.supportedTypes.some(
            (type) => type.toUpperCase() === identity.type,
          )))
    ) {
      operation.diagnostic = 'CTS_DELETE_TYPE_UNSUPPORTED';
      continue;
    }
    const indexed = new Map(
      previous?.ownedFiles.map((file) => [sourcePath(file.path), file.hash]) ??
        [],
    );
    const candidates = [...new Set([...indexed.keys(), ...matchingPaths])].sort(
      compareStrings,
    );
    if (identity.type === 'DEVC' && !previous && candidates.length === 0) {
      operation.diagnostic = 'CTS_DELETE_OWNERSHIP_NOT_PROVEN';
      continue;
    }
    const files = new Map<string, string>();
    let diverged = false;
    for (const path of candidates) {
      sourcePath(path);
      const content = await readRegularFile(input.root, path);
      if (content === undefined) {
        operation.alreadyAbsent.push(path);
        continue;
      }
      const hash = sha256(content);
      if (indexed.has(path) && indexed.get(path) !== hash) diverged = true;
      const parsed = format.parseFilename?.(basename(path));
      if (
        parsed &&
        !matches(format, path, identity) &&
        !(
          identity.type === 'DEVC' &&
          parsed.type.toUpperCase() === 'DEVC' &&
          parsed.name.toUpperCase() === 'PACKAGE' &&
          indexed.has(path)
        )
      )
        diverged = true;
      files.set(path, hash);
    }
    if (diverged) {
      operation.diagnostic = 'CTS_DELETE_FILE_DIVERGED';
      continue;
    }
    operation.paths = [...files.keys()];
    operation.outcome =
      files.size === 0
        ? 'already_absent'
        : input.dryRun
          ? 'planned'
          : 'removed';
    for (const [path, hash] of files) {
      ownedPaths.add(path);
      expected.set(path, hash);
    }
    for (const path of operation.alreadyAbsent) expected.set(path, null);
    const descriptorPath = objectDescriptorPath(identity);
    const content = stableJson({
      ...createTombstoneDescriptor(
        identity,
        previous,
        configDigest,
        formatDigest,
      ),
      requiresInventoryRefresh: true,
    });
    const old = await readText(input.root, descriptorPath);
    desired.push({
      path: descriptorPath,
      content,
      role: 'metadata',
      owner: identity.canonical,
    });
    ownedPaths.add(descriptorPath);
    expected.set(descriptorPath, old === undefined ? null : sha256(old));
  }
  const plan = await planRepositoryChanges(input.root, desired, ownedPaths);
  // Recheck bytes after all observations, before transactional mutation.
  for (const [path, hash] of expected) {
    const content = await readRegularFile(input.root, path);
    if ((content === undefined ? null : sha256(content)) !== hash)
      throw new AdtFlowError(
        'working_tree_diverged',
        'Deletion evidence changed while planning.',
        { path },
      );
  }
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
