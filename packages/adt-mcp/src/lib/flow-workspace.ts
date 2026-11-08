import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, normalize, relative, resolve, sep } from 'node:path';

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(normalize(root), normalize(candidate));
  // '' means candidate is root itself; anything that escapes the root starts
  // with '..' or is absolute. Names that merely start with '..' (e.g. '..foo')
  // are legitimate and must stay inside.
  return (
    rel === '' ||
    (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
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
