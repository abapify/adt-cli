import { compareStrings } from './deterministic';
import { objectDescriptorSchema } from './schemas';
import { AdtFlowError } from './types';

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

/**
 * Assess derived ownership only. The caller must prove the accepted merge and
 * clean source, archive original bytes, and recheck evidence before mutation.
 * This function neither proves Git history nor authorizes index removal.
 */
export function assessFlowIndexReconciliation(
  input: FlowIndexReconciliationInput,
): FlowIndexReconciliationAssessment {
  const descriptor = objectDescriptorSchema.parse(input.descriptor);
  const paths = new Set<string>();
  const changedPaths: string[] = [];
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
    if (
      requireHashEvidence(input.currentFileHashes, file.path, 'current') !==
      file.hash
    ) {
      changedPaths.push(file.path);
    }
  }
  if (changedPaths.length) {
    // A later merge cannot explain an index already corrupt at its prior boundary.
    for (const file of descriptor.ownedFiles) {
      if (
        requireHashEvidence(input.previousFileHashes, file.path, 'previous') !==
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
  return {
    identity: descriptor.identity.canonical,
    status: changedPaths.length ? 'stale' : 'current',
    changedPaths: changedPaths.sort(compareStrings),
  };
}
