import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(__dirname, 'fixtures');

/**
 * Load a fixture file by path
 * @param path - Relative path from fixtures/ directory (e.g., 'transport/single.xml')
 * @returns Promise resolving to file contents as string
 */
export function load(path: string): Promise<string> {
  const fullPath = join(FIXTURES_ROOT, path);
  return readFile(fullPath, 'utf-8');
}

/**
 * Get the absolute path to a fixture file
 * @param path - Relative path from fixtures/ directory
 * @returns Absolute path to the fixture file
 */
export function getPath(path: string): string {
  return join(FIXTURES_ROOT, path);
}

/**
 * Get the fixtures root directory
 */
export function getFixturesRoot(): string {
  return FIXTURES_ROOT;
}
