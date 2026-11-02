import { randomBytes } from 'node:crypto';
import type { Stats } from 'node:fs';

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

// Empty string, exactly '.', NUL, or backslash make a path unsafe as input.
const INVALID_RELATIVE_PATH = /^(?:$|\.$)|[\0\\]/;

function isValidRelativeInput(path: string): boolean {
  return (
    !INVALID_RELATIVE_PATH.test(path) &&
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
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    compareStrings(left.name, right.name),
  )) {
    const child = posix.join(relativeDir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...(await walkFiles(root, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
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

  for (const file of desired) {
    const portableCollision = existingByFoldedPath.get(file.path.toLowerCase());
    if (portableCollision && portableCollision !== file.path) {
      throw new AdtFlowError(
        'path_collision',
        'A desired path collides with an existing path on a case-insensitive filesystem.',
        { path: file.path, existingPath: portableCollision },
      );
    }
    const current = await readText(root, file.path);
    if (current === undefined) {
      writes.set(file.path, file.content);
    } else if (!ownedPaths.has(file.path)) {
      throw new AdtFlowError(
        'path_collision',
        'A desired path is occupied by an unowned file.',
        { path: file.path },
      );
    } else if (await isOwnedSymlink(root, file.path)) {
      throw new AdtFlowError(
        'path_invalid',
        'Flow cannot write through an owned symlink.',
        { path: file.path },
      );
    } else if (current === file.content) {
      unchanged.push(file.path);
    } else {
      writes.set(file.path, file.content);
    }
  }

  const removes: string[] = [];
  for (const path of [...ownedPaths]
    .filter((item) => !desiredByPath.has(item))
    .sort((a, b) => compareStrings(a, b))) {
    if (await fileExists(root, path)) removes.push(path);
  }
  const removedByHash = new Map<string, string[]>();
  for (const path of removes) {
    const content = await readText(root, path);
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

  return { writes, removes, unchanged: unchanged.sort(compareStrings), moved };
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
  const snapshots = new Map<string, Snapshot>();
  for (const path of paths) {
    const absolute = absolutePath(root, path);
    const stats = await lstatSafe(absolute);
    if (!stats) {
      snapshots.set(path, { kind: 'missing' });
    } else if (stats.isSymbolicLink()) {
      snapshots.set(path, {
        kind: 'symlink',
        target: await readlink(absolute),
      });
    } else if (stats.isFile()) {
      snapshots.set(path, { kind: 'file', content: await readFile(absolute) });
    } else {
      // Directories or other non-file entries cannot be restored; record as
      // missing so rollback does not try to recreate them.
      snapshots.set(path, { kind: 'missing' });
    }
  }
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
