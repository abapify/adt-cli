import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  rmSync,
} from 'node:fs';
import { join, basename } from 'node:path';

/**
 * Execute shell command
 */
export function exec(
  cmd: string,
  options?: { silent?: boolean; maxBuffer?: number },
): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    maxBuffer: options?.maxBuffer ?? 50 * 1024 * 1024,
    stdio: options?.silent ? 'pipe' : 'inherit',
  });
}

/**
 * Execute shell command and return output
 */
export function execOutput(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

/**
 * Find files matching glob pattern using native find/ls
 */
export function findFiles(dir: string, pattern: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });

  // Convert glob to regex
  const regex = new RegExp(
    '^' +
      pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') +
      '$',
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
