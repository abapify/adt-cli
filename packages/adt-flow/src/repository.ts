import { randomBytes } from 'node:crypto';
import { constants, type Stats } from 'node:fs';

import {
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  realpath,
  readdir,
  rename,
  rmdir,
  rm,
  stat,
  symlink,
} from 'node:fs/promises';
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path';
import type { MaterializedFormatFile } from '@abapify/adt-plugin';
import { compareStrings, sha256 } from './deterministic';
import { AdtFlowError } from './types';

export type DesiredFile = MaterializedFormatFile & {
  owner: string;
};

export interface RepositoryPlan {
  writes: Map<string, string>;
  removes: string[];
  unchanged: string[];
  moved: Array<{ from: string; to: string }>;
}

// NUL or backslash anywhere in the path make it unsafe as input.
const UNSAFE_PATH_CHARS = /[\0\\]/;

function isValidRelativeInput(path: string): boolean {
  return (
    path !== '' &&
    path !== '.' &&
    !UNSAFE_PATH_CHARS.test(path) &&
    !isAbsolute(path) &&
    !posix.isAbsolute(path)
  );
}

function isValidNormalizedPath(normalized: string, original: string): boolean {
  return (
    normalized !== '..' &&
    !normalized.startsWith('../') &&
    normalized === original
  );
}

export function safeRelativePath(path: string): string {
  if (!isValidRelativeInput(path)) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow paths must be non-empty repository-relative POSIX paths.',
      { path },
    );
  }
  const normalized = posix.normalize(path);
  if (!isValidNormalizedPath(normalized, path)) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow path normalization would escape or change the repository path.',
      { path },
    );
  }
  return normalized;
}

export function absolutePath(root: string, relativePath: string): string {
  const safe = safeRelativePath(relativePath);
  const absoluteRoot = resolve(root);
  const absolute = resolve(absoluteRoot, ...safe.split('/'));
  if (
    absolute !== absoluteRoot &&
    !absolute.startsWith(`${absoluteRoot}${sep}`)
  ) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow path escapes the repository root.',
      { path: relativePath },
    );
  }
  return absolute;
}

function pathEscapesRoot(rel: string): boolean {
  return (
    rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)
  );
}

function isInsideRoot(realRoot: string, target: string): boolean {
  const rel = relative(realRoot, target);
  return (
    rel !== '' &&
    rel !== '..' &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
}

async function lstatSafe(path: string): Promise<Stats | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function isOwnedSymlink(root: string, path: string): Promise<boolean> {
  const stats = await lstatSafe(absolutePath(root, path));
  return stats ? stats.isSymbolicLink() : false;
}

async function resolveSymlinkChain(
  path: string,
  realRoot: string,
  seen = new Set<string>(),
): Promise<string> {
  const stats = await lstat(path);
  if (!stats.isSymbolicLink()) return path;
  if (seen.has(path)) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow path contains a symlink cycle.',
      { path },
    );
  }
  seen.add(path);

  const target = await readlink(path);
  const resolved = resolve(dirname(path), target);
  if (!isInsideRoot(realRoot, resolved)) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow path resolves outside the repository root.',
      { path },
    );
  }
  return resolveSymlinkChain(resolved, realRoot, seen);
}

function ensureDirectory(stats: Stats, path: string): void {
  if (stats.isDirectory()) return;
  throw new AdtFlowError(
    'path_invalid',
    'Flow path parent is not a directory.',
    { path },
  );
}

async function validatePhysicalRoot(
  root: string,
  absolute: string,
): Promise<void> {
  const rootResolved = resolve(root);
  const rel = relative(rootResolved, absolute);
  if (pathEscapesRoot(rel)) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow path escapes the repository root.',
      { path: absolute },
    );
  }

  const realRoot = await realpath(rootResolved);
  const components = rel.split(sep).filter(Boolean);
  let current = realRoot;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const next = resolve(current, component);
    const stats = await lstatSafe(next);
    if (!stats) return;

    if (stats.isSymbolicLink()) {
      current = await resolveSymlinkChain(next, realRoot);
      continue;
    }

    if (i < components.length - 1) {
      ensureDirectory(stats, next);
    }

    current = next;
  }
}

async function withEnoent<T>(
  operation: () => Promise<T>,
  enoentValue: T,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return enoentValue;
    throw error;
  }
}

async function withValidatedPath<T>(
  root: string,
  path: string,
  operation: (absolute: string) => Promise<T>,
  enoentValue: T,
): Promise<T> {
  return withEnoent(async () => {
    const absolute = absolutePath(root, path);
    await validatePhysicalRoot(root, absolute);
    return operation(absolute);
  }, enoentValue);
}

export async function readText(
  root: string,
  path: string,
): Promise<string | undefined> {
  return withValidatedPath(
    root,
    path,
    (absolute) => readFile(absolute, 'utf8'),
    undefined,
  );
}

/** Read preserved source bytes without following a repository-relative symlink. */
export async function readRegularText(
  root: string,
  path: string,
): Promise<string | undefined> {
  return withValidatedPath(
    root,
    path,
    async (absolute) => {
      const safePath = safeRelativePath(path);
      const realRoot = await realpath(root);
      const expected = resolve(realRoot, safePath);
      const assertRegularTarget = async () => {
        // Re-validate the full parent chain immediately before open to narrow
        // the TOCTOU window where a parent component could be swapped for a
        // symlink (O_NOFOLLOW only protects the final path component).
        // Node.js does not expose openat-style handle-relative traversal, so a
        // residual race remains if an attacker can concurrently mutate the repo.
        await validatePhysicalRoot(root, absolute);
        if ((await realpath(absolute)) !== expected) {
          throw new AdtFlowError(
            'path_invalid',
            'Flow cannot preserve a symlinked source path.',
            { path },
          );
        }
      };

      await assertRegularTarget();
      const handle = await open(
        absolute,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        // Best-effort post-open verification: on Linux, /proc/self/fd/<fd>
        // resolves to the opened target, closing the parent-swap race when
        // available.
        if (process.platform === 'linux') {
          try {
            const opened = await realpath(`/proc/self/fd/${handle.fd}`);
            if (opened !== expected) {
              throw new AdtFlowError(
                'path_invalid',
                'Flow cannot preserve a symlinked source path.',
                { path },
              );
            }
          } catch (error) {
            if (error instanceof AdtFlowError) throw error;
          }
        }
        return await handle.readFile('utf8');
      } finally {
        await handle.close();
      }
    },
    undefined,
  );
}

async function fileExists(root: string, path: string): Promise<boolean> {
  return withValidatedPath(
    root,
    path,
    async (absolute) => (await stat(absolute)).isFile(),
    false,
  );
}

export async function walkFiles(
  root: string,
  relativeDir: string,
): Promise<string[]> {
  const absoluteDir = absolutePath(root, relativeDir);
  await validatePhysicalRoot(root, absoluteDir);
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const perEntry = await Promise.all(
    entries
      .sort((left, right) => compareStrings(left.name, right.name))
      .map(async (entry) => {
        const child = posix.join(relativeDir, entry.name);
        if (entry.isSymbolicLink()) return [];
        if (entry.isDirectory()) return walkFiles(root, child);
        if (entry.isFile()) return [child];
        return [];
      }),
  );
  return perEntry.flat();
}

export function validateDesiredFiles(files: readonly DesiredFile[]): void {
  const exact = new Map<string, string>();
  const portable = new Map<string, string>();
  for (const file of files) {
    const path = safeRelativePath(file.path);
    if (exact.has(path)) {
      throw new AdtFlowError(
        'path_collision',
        'The desired tree contains a duplicate path.',
        { path },
      );
    }
    exact.set(path, file.owner);
    const folded = path.toLocaleLowerCase('en-US');
    const existingPath = portable.get(folded);
    if (existingPath && existingPath !== path) {
      throw new AdtFlowError(
        'path_collision',
        'Desired paths collide on a case-insensitive filesystem.',
        { path, existingPath },
      );
    }
    portable.set(folded, path);
  }
  const sortedPaths = [...exact.keys()].sort(compareStrings);
  for (let index = 0; index < sortedPaths.length - 1; index++) {
    const path = sortedPaths[index];
    const next = sortedPaths[index + 1];
    if (next.startsWith(`${path}/`)) {
      throw new AdtFlowError(
        'path_collision',
        'Desired paths contain a parent and child collision.',
        { path, child: next },
      );
    }
  }
}

export async function findDivergedOwnedPath(
  root: string,
  files: readonly { path: string; hash: string }[],
): Promise<string | undefined> {
  for (const file of files) {
    const content = await readText(root, file.path);
    if (content === undefined || sha256(content) !== file.hash) {
      return file.path;
    }
  }
  return undefined;
}

export async function verifyOwnedHashes(
  root: string,
  files: readonly { path: string; hash: string }[],
): Promise<boolean> {
  return (await findDivergedOwnedPath(root, files)) === undefined;
}

/**
 * Decide what to do with one desired file — write, keep as unchanged, or
 * throw on a collision. Validation errors keep their exact type/message.
 */
function classifyDesiredFile(
  file: DesiredFile,
  current: string | undefined,
  portableCollision: string | undefined,
  ownedPaths: ReadonlySet<string>,
  isSymlink: boolean,
): 'write' | 'unchanged' {
  if (portableCollision && portableCollision !== file.path) {
    throw new AdtFlowError(
      'path_collision',
      'A desired path collides with an existing path on a case-insensitive filesystem.',
      { path: file.path, existingPath: portableCollision },
    );
  }
  if (current === undefined) return 'write';
  if (!ownedPaths.has(file.path)) {
    throw new AdtFlowError(
      'path_collision',
      'A desired path is occupied by an unowned file.',
      { path: file.path },
    );
  }
  if (isSymlink) {
    throw new AdtFlowError(
      'path_invalid',
      'Flow cannot write through an owned symlink.',
      { path: file.path },
    );
  }
  return current === file.content ? 'unchanged' : 'write';
}

export async function planRepositoryChanges(
  root: string,
  desired: readonly DesiredFile[],
  ownedPaths: ReadonlySet<string>,
  ownedOwners?: ReadonlyMap<string, string>,
): Promise<RepositoryPlan> {
  validateDesiredFiles(desired);
  const desiredByPath = new Map(desired.map((file) => [file.path, file]));
  const existingSourcePaths = await walkFiles(root, 'src');
  const existingByFoldedPath = new Map(
    existingSourcePaths.map((path) => [path.toLowerCase(), path]),
  );
  const writes = new Map<string, string>();
  const unchanged: string[] = [];

  const currentByPath = new Map<string, string | undefined>(
    await Promise.all(
      desired.map(
        async (file) => [file.path, await readText(root, file.path)] as const,
      ),
    ),
  );
  const symlinkByPath = new Map<string, boolean>(
    await Promise.all(
      desired
        .filter(
          (file) =>
            currentByPath.get(file.path) !== undefined &&
            ownedPaths.has(file.path),
        )
        .map(
          async (file) =>
            [file.path, await isOwnedSymlink(root, file.path)] as const,
        ),
    ),
  );

  for (const file of desired) {
    const action = classifyDesiredFile(
      file,
      currentByPath.get(file.path),
      existingByFoldedPath.get(file.path.toLowerCase()),
      ownedPaths,
      symlinkByPath.get(file.path) ?? false,
    );
    if (action === 'write') {
      writes.set(file.path, file.content);
    } else {
      unchanged.push(file.path);
    }
  }

  const removeCandidates = [...ownedPaths]
    .filter((item) => !desiredByPath.has(item))
    .sort((a, b) => compareStrings(a, b));
  const existsByPath = new Map<string, boolean>(
    await Promise.all(
      removeCandidates.map(
        async (path) => [path, await fileExists(root, path)] as const,
      ),
    ),
  );
  const removes: string[] = [];
  for (const path of removeCandidates) {
    if (existsByPath.get(path)) removes.push(path);
  }
  const removedByHash = new Map<string, string[]>();
  const removedContents = await Promise.all(
    removes.map((path) => readText(root, path)),
  );
  for (const [index, path] of removes.entries()) {
    const content = removedContents[index];
    if (content === undefined) continue;
    const hash = sha256(content);
    removedByHash.set(hash, [...(removedByHash.get(hash) ?? []), path]);
  }
  const moved: Array<{ from: string; to: string }> = [];
  for (const [to, content] of writes) {
    const candidates = removedByHash.get(sha256(content));
    const toOwner = desiredByPath.get(to)?.owner;
    const from = candidates?.find(
      (candidate) => !ownedOwners || ownedOwners.get(candidate) === toOwner,
    );
    if (from) {
      candidates?.splice(candidates.indexOf(from), 1);
      moved.push({ from, to });
    }
  }

  unchanged.sort(compareStrings);
  return { writes, removes, unchanged, moved };
}

async function ensureParentDirectories(
  root: string,
  path: string,
  createdDirs: Set<string>,
): Promise<void> {
  const absolute = absolutePath(root, path);
  const target = dirname(absolute);
  const rootResolved = resolve(root);
  const rel = relative(rootResolved, target);
  if (pathEscapesRoot(rel)) return;

  const components = rel.split(sep).filter(Boolean);
  let current = rootResolved;
  for (const component of components) {
    current = resolve(current, component);
    if (await exists(current)) continue;
    await mkdir(current);
    createdDirs.add(current);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function removeEmptyDirectories(
  root: string,
  dirs: Iterable<string>,
): Promise<void> {
  const sorted = [...dirs].sort((left, right) => right.length - left.length);
  for (const dir of sorted) {
    try {
      const entries = await readdir(dir);
      if (entries.length === 0) await rmdir(dir);
    } catch {
      // Ignore races and non-empty directories.
    }
  }
}

async function atomicWrite(
  root: string,
  path: string,
  content: string | Buffer,
  createdDirs?: Set<string>,
): Promise<void> {
  const absolute = absolutePath(root, path);
  await validatePhysicalRoot(root, absolute);
  if (createdDirs) await ensureParentDirectories(root, path, createdDirs);
  await mkdir(dirname(absolute), { recursive: true });

  const temporary = `${absolute}.adt-flow-${randomBytes(16).toString('hex')}.tmp`;
  await validatePhysicalRoot(root, temporary);
  const handle = await open(temporary, 'wx');
  try {
    await handle.writeFile(content);
    await handle.close();
    await rename(temporary, absolute);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

type Snapshot =
  | { kind: 'missing' }
  | { kind: 'file'; content: Buffer }
  | { kind: 'symlink'; target: string };

async function captureSnapshots(
  root: string,
  paths: Iterable<string>,
): Promise<Map<string, Snapshot>> {
  const captured = await Promise.all(
    [...paths].map(async (path): Promise<[string, Snapshot]> => {
      const absolute = absolutePath(root, path);
      const stats = await lstatSafe(absolute);
      if (!stats) {
        return [path, { kind: 'missing' }];
      } else if (stats.isSymbolicLink()) {
        return [path, { kind: 'symlink', target: await readlink(absolute) }];
      } else if (stats.isFile()) {
        return [path, { kind: 'file', content: await readFile(absolute) }];
      }
      // Directories or other non-file entries cannot be restored; record as
      // missing so rollback does not try to recreate them.
      return [path, { kind: 'missing' }];
    }),
  );
  const snapshots = new Map<string, Snapshot>(captured);
  return snapshots;
}

async function restoreSnapshots(
  root: string,
  snapshots: ReadonlyMap<string, Snapshot>,
): Promise<void> {
  for (const [path, snapshot] of snapshots) {
    const absolute = absolutePath(root, path);
    if (snapshot.kind === 'missing') {
      await rm(absolute, { force: true });
    } else if (snapshot.kind === 'symlink') {
      await rm(absolute, { force: true });
      await symlink(snapshot.target, absolute);
    } else {
      await atomicWrite(root, path, snapshot.content);
    }
  }
}

export async function applyRepositoryPlan(
  root: string,
  plan: RepositoryPlan,
): Promise<void> {
  const snapshots = await captureSnapshots(root, [
    ...plan.writes.keys(),
    ...plan.removes,
  ]);
  const createdDirs = new Set<string>();

  try {
    for (const [path, content] of plan.writes)
      await atomicWrite(root, path, content, createdDirs);
    for (const path of plan.removes) {
      const absolute = absolutePath(root, path);
      await validatePhysicalRoot(root, absolute);
      await rm(absolute, { force: true });
    }
  } catch (error) {
    try {
      await restoreSnapshots(root, snapshots);
      await removeEmptyDirectories(root, createdDirs);
    } catch (rollbackError) {
      throw new AdtFlowError(
        'apply_failed',
        'Flow apply failed and rollback could not restore the complete tree.',
        {
          cause: String(error),
          rollback: String(rollbackError),
        },
      );
    }
    throw new AdtFlowError(
      'apply_failed',
      'Flow apply failed; the previous tree was restored.',
      { cause: String(error) },
    );
  }
}
