import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Execute a command with an argument vector (no shell interpolation) and
 * return its stdout. Callers pass already-validated arguments.
 */
export function execOutput(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * Find files matching glob pattern using native find/ls
 */
export function findFiles(dir: string, pattern: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });

  // Convert glob to regex. Escape ALL regex metacharacters except the glob
  // wildcards '*' and '?' first, so characters like '+', '(', '[' in the
  // pattern can't introduce regex syntax. Then expand the wildcards.
  const escaped = pattern.replaceAll(/[.+^${}()|[\]\\/]/g, '\\$&');
  const regex = new RegExp(
    '^' + escaped.replaceAll('*', '.*').replaceAll('?', '.') + '$',
  );

  for (const entry of entries) {
    if (entry.isFile() && regex.test(entry.name)) {
      const parentPath = entry.parentPath ?? dir;
      files.push(join(parentPath, entry.name));
    }
  }

  return files;
}

/**
 * Ensure directory exists
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Clean directory
 */
export function cleanDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
  mkdirSync(dir, { recursive: true });
}
