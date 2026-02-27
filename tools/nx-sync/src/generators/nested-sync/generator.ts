import { Tree, logger, workspaceRoot } from '@nx/devkit';
import { existsSync, readdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { getIgnoreObject } from 'nx/src/utils/ignore';
import { SyncError } from 'nx/src/utils/sync-generators';

import type { NxNestedSyncGeneratorSchema } from './schema';

interface WorkspaceInfo {
  absolutePath: string;
  relativePath: string;
}

interface PendingWorkspace extends WorkspaceInfo {
  details: string[];
}

interface WorkspaceCheckResult {
  needsSync: boolean;
  details: string[];
}

const MARKER_FILE = '.nx/nested-sync/pending.json';
const MAX_OUTPUT_LINES = 20;
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.nx',
  'coverage',
  'dist',
  'node_modules',
  'tmp',
]);

export default async function nestedSyncGenerator(
  tree: Tree,
  _schema: NxNestedSyncGeneratorSchema,
) {
  const nestedWorkspaces = findNestedWorkspaces();

  if (!nestedWorkspaces.length) {
    return {
      outOfSyncMessage: 'No nested Nx workspaces detected.',
      outOfSyncDetails: [],
    };
  }

  const pending: PendingWorkspace[] = [];

  for (const workspace of nestedWorkspaces) {
    const result = checkWorkspace(workspace);
    if (result.needsSync) {
      pending.push({
        ...workspace,
        details: result.details,
      });
    }
  }

  if (!pending.length) {
    return {
      outOfSyncMessage: `Checked ${nestedWorkspaces.length} nested Nx workspace${
        nestedWorkspaces.length === 1 ? '' : 's'
      } – all are in sync.`,
      outOfSyncDetails: [],
    };
  }

  tree.write(
    MARKER_FILE,
    JSON.stringify(
      {
        workspaces: pending.map((workspace) => workspace.relativePath),
      },
      null,
      2,
    ),
  );

  return {
    outOfSyncMessage: `Detected ${pending.length} nested Nx workspace${
      pending.length === 1 ? '' : 's'
    } requiring sync.`,
    outOfSyncDetails: pending.flatMap((workspace) =>
      formatOutOfSyncDetail(workspace),
    ),
    callback: async () => {
      for (const workspace of pending) {
        await runNestedSync(workspace);
      }

      await cleanupMarkerFile();
    },
  };
}

function findNestedWorkspaces(): WorkspaceInfo[] {
  const ignore = getIgnoreObject();
  const discovered: WorkspaceInfo[] = [];
  const queue: string[] = [workspaceRoot];

  while (queue.length > 0) {
    const current = queue.pop()!;
    let entries;

    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        continue;
      }

      if (SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const absolutePath = join(current, entry.name);
      const relativePath = normalizeRelativePath(
        relative(workspaceRoot, absolutePath),
      );

      if (!relativePath || relativePath.startsWith('..')) {
        continue;
      }

      if (ignore.ignores(relativePath) || ignore.ignores(`${relativePath}/`)) {
        continue;
      }

      const nestedNxJsonPath = join(absolutePath, 'nx.json');

      if (existsSync(nestedNxJsonPath)) {
        discovered.push({
          absolutePath,
          relativePath,
        });
        // Avoid descending deeper once we've found a nested workspace root.
        continue;
      }

      queue.push(absolutePath);
    }
  }

  return discovered;
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function checkWorkspace(workspace: WorkspaceInfo): WorkspaceCheckResult {
  const result = runNxSyncCommand(workspace, ['--check']);

  if (result.status === 0) {
    return { needsSync: false, details: [] };
  }

  if (result.status === 1) {
    const details = collectOutputLines(result);
    return {
      needsSync: true,
      details:
        details.length > 0
          ? details
          : ['nx sync --check reported out-of-sync files.'],
    };
  }

  throw new SyncError(
    `Failed to verify nested workspace "${workspace.relativePath}"`,
    collectOutputLines(result),
  );
}

async function runNestedSync(workspace: PendingWorkspace) {
  logger.info(`[nx-sync] Running nx sync inside ${workspace.relativePath}`);
  const result = runNxSyncCommand(workspace, []);

  if (result.status !== 0) {
    throw new SyncError(
      `Failed to sync nested workspace "${workspace.relativePath}"`,
      collectOutputLines(result),
    );
  }
}

function runNxSyncCommand(
  workspace: WorkspaceInfo,
  extraArgs: string[],
): SpawnSyncReturns<string> {
  const nxBin = resolveNxBinary(workspace);
  const result = spawnSync(process.execPath, [nxBin, 'sync', ...extraArgs], {
    cwd: workspace.absolutePath,
    encoding: 'utf-8',
    stdio: 'pipe',
  }) as SpawnSyncReturns<string>;

  if (result.error) {
    throw new SyncError(
      `Failed to execute Nx inside "${workspace.relativePath}"`,
      [result.error.message],
    );
  }

  if (result.status === null) {
    throw new SyncError(
      `Nx exited unexpectedly while processing "${workspace.relativePath}"`,
      collectOutputLines(result),
    );
  }

  return result;
}

const nxBinaryCache = new Map<string, string>();

function resolveNxBinary(workspace: WorkspaceInfo): string {
  const cached = nxBinaryCache.get(workspace.absolutePath);

  if (cached) {
    return cached;
  }

  try {
    const nxPath = require.resolve('nx/bin/nx.js', {
      paths: [workspace.absolutePath],
    });
    nxBinaryCache.set(workspace.absolutePath, nxPath);
    return nxPath;
  } catch {
    throw new SyncError(
      `Unable to locate Nx CLI for "${workspace.relativePath}"`,
      [
        'Install dependencies for that workspace or ensure it is a valid Nx project.',
      ],
    );
  }
}

function collectOutputLines(result: SpawnSyncReturns<string>): string[] {
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();

  if (!output) {
    return [];
  }

  const lines = output.split(/\r?\n/).map((line) => line.trimEnd());
  return lines.slice(-MAX_OUTPUT_LINES);
}

function formatOutOfSyncDetail(workspace: PendingWorkspace): string[] {
  if (!workspace.details.length) {
    return [`- ${workspace.relativePath}`];
  }

  return [
    `- ${workspace.relativePath}`,
    ...workspace.details.map((line) => `    ${line}`),
  ];
}

async function cleanupMarkerFile() {
  const absoluteMarkerPath = join(workspaceRoot, MARKER_FILE);

  try {
    await fs.rm(absoluteMarkerPath, { force: true });
  } catch {
    // Ignore cleanup errors; the file lives in .nx and is not committed.
  }
}
