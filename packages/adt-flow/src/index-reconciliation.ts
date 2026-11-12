import { compareStrings } from './deterministic';
import { objectDescriptorSchema } from './schemas';
import { AdtFlowError } from './types';
import type { z } from 'zod';

export interface FlowIndexReconciliationInput {
  descriptor: unknown;
  /** An explicit null means the caller verified that the path is absent. */
  currentFileHashes: ReadonlyMap<string, string | null>;
  previousFileHashes: ReadonlyMap<string, string | null>;
}

export interface FlowIndexReconciliationAssessment {
  identity: string;
  status: 'current' | 'stale';
  changedPaths: string[];
}

type FlowObjectDescriptor = z.infer<typeof objectDescriptorSchema>;

function requireHashEvidence(
  evidence: ReadonlyMap<string, string | null>,
  path: string,
  boundary: 'current' | 'previous',
): string | null {
  if (!evidence.has(path)) {
    throw new AdtFlowError(
      'invalid_input',
      `Missing ${boundary} file evidence.`,
      { path },
    );
  }
  const hash = evidence.get(path);
  if (
    hash !== null &&
    (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
  ) {
    throw new AdtFlowError('invalid_input', `Invalid ${boundary} file hash.`, {
      path,
    });
  }
  return hash;
}

function assertUniqueOwnedPaths(descriptor: FlowObjectDescriptor): void {
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

function findChangedOwnedPaths(
  descriptor: FlowObjectDescriptor,
  currentFileHashes: ReadonlyMap<string, string | null>,
): string[] {
  const changedPaths: string[] = [];
  for (const file of descriptor.ownedFiles) {
    if (
      requireHashEvidence(currentFileHashes, file.path, 'current') !== file.hash
    ) {
      changedPaths.push(file.path);
    }
  }
  return changedPaths;
}

/**
 * A later merge cannot explain an index already corrupt at its prior boundary.
 */
function assertPreviousBoundary(
  descriptor: FlowObjectDescriptor,
  previousFileHashes: ReadonlyMap<string, string | null>,
): void {
  for (const file of descriptor.ownedFiles) {
    if (
      requireHashEvidence(previousFileHashes, file.path, 'previous') !==
      file.hash
    ) {
      throw new AdtFlowError(
        'working_tree_diverged',
        'Flow index does not match previous source.',
        { path: file.path },
      );
    }
  }
}

/**
 * Assess derived ownership only. The caller must prove the accepted merge and
 * clean source, archive original bytes, and recheck evidence before mutation.
 * This function neither proves Git history nor authorizes index removal.
 */
export function assessFlowIndexReconciliation(
  input: FlowIndexReconciliationInput,
): FlowIndexReconciliationAssessment {
  const parsed = objectDescriptorSchema.safeParse(input.descriptor);
  if (!parsed.success) {
    throw new AdtFlowError(
      'invalid_input',
      'A flow descriptor uses an unsupported or invalid schema.',
      { issues: parsed.error.issues },
    );
  }
  const descriptor = parsed.data;
  assertUniqueOwnedPaths(descriptor);
  const changedPaths = findChangedOwnedPaths(
    descriptor,
    input.currentFileHashes,
  );
  if (changedPaths.length) {
    assertPreviousBoundary(descriptor, input.previousFileHashes);
  }
  return {
    identity: descriptor.identity.canonical,
    status: changedPaths.length ? 'stale' : 'current',
    changedPaths: changedPaths.sort(compareStrings),
  };
}
