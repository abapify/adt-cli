import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, normalize, relative, resolve, sep } from 'node:path';

function isWithin(root: string, candidate: string): boolean {
  const normalizedRoot = normalize(root);
  const normalizedCandidate = normalize(candidate);
  if (normalizedCandidate === normalizedRoot) {
    return true;
  }
  if (!normalizedCandidate.startsWith(normalizedRoot + sep)) {
    // Also handle case where root might not end with separator in comparison
    // but ensure we don't have partial matches
    const rel = relative(normalizedRoot, normalizedCandidate);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return false;
    }
    return !rel.split(sep).includes('..');
  }
  const path = relative(normalizedRoot, normalizedCandidate);
  return (
    path === '' ||
    (!isAbsolute(path) && !path.split(sep).filter(Boolean).includes('..'))
  );
}

export async function resolveFlowWorkspaceRoot(
  requested: string,
  allowedRoots: readonly string[] = [process.cwd()],
): Promise<string> {
  if (typeof requested !== 'string' || requested.length === 0) {
    throw new Error('workspaceRoot must be a non-empty string.');
  }
  // Reject path traversal sequences in the input
  const normalizedInput = normalize(requested);
  if (normalizedInput.split(sep).includes('..')) {
    throw new Error('workspaceRoot must not contain path traversal sequences.');
  }
  if (!isAbsolute(requested) && !isAbsolute(normalizedInput))
    throw new Error('workspaceRoot must be absolute.');
  const requestedPath = resolve(normalizedInput);
  if (normalize(requestedPath).split(sep).includes('..')) {
    throw new Error('workspaceRoot must not contain path traversal sequences.');
  }
  // Lexical containment first, so no filesystem call ever touches a path
  // that is outside every allowed root even before realpath() hardening.
  const lexicalRoots = allowedRoots.map((root) => resolve(root));
  if (!lexicalRoots.some((root) => isWithin(root, requestedPath))) {
    throw new Error('workspaceRoot is outside the server-owned roots.');
  }
  const requestedStats = await lstat(requestedPath);
  if (!requestedStats.isDirectory() || requestedStats.isSymbolicLink()) {
    throw new Error('workspaceRoot must be a real directory (no symlinks).');
  }
  const candidate = await realpath(requestedPath);
  const allowed = await Promise.all(
    allowedRoots.map((root) => realpath(resolve(root))),
  );
  if (!allowed.some((root) => isWithin(root, candidate))) {
    throw new Error('workspaceRoot is outside the server-owned roots.');
  }
  return candidate;
}
