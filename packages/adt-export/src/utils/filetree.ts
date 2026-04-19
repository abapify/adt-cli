/**
 * FileTree implementations
 */

import {
  readFile,
  readdir,
  access,
  glob as nativeGlob,
} from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { FileTree } from '@abapify/adt-plugin';

/**
 * File system backed FileTree
 */
export class FsFileTree implements FileTree {
  constructor(public readonly root: string) {}

  async glob(pattern: string): Promise<string[]> {
    const results: string[] = [];
    // Node.js native glob returns AsyncIterator of strings
    for await (const path of nativeGlob(pattern, { cwd: this.root })) {
      results.push(path);
    }
    return results;
  }

  async read(path: string): Promise<string> {
    const fullPath = join(this.root, path);
    const content = await readFile(fullPath, 'utf-8');
    // Strip UTF-8 BOM if present
    return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  }

  async readBuffer(path: string): Promise<Buffer> {
    const fullPath = join(this.root, path);
    return readFile(fullPath);
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.root, path);
    try {
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async readdir(path: string): Promise<string[]> {
    const fullPath = path ? join(this.root, path) : this.root;
    return readdir(fullPath);
  }
}

/**
 * In-memory FileTree for testing
 */
export class MemoryFileTree implements FileTree {
  constructor(
    public readonly root: string,
    private files: Map<string, string | Buffer>,
  ) {}

  async glob(pattern: string): Promise<string[]> {
    // Simple glob matching for testing.
    // Step 1: escape ALL regex metacharacters except '*' (our glob syntax).
    //         This prevents metachars like '+', '(' in the pattern from
    //         being interpreted as regex. Also avoids the
    //         incomplete-sanitization pitfall where a later unconditional
    //         escape of '.' re-mangled characters produced by earlier
    //         wildcard expansions (e.g. '**' -> '.*' -> '\\.\\*').
    // Step 2: expand '**' then '*' using a placeholder that contains no
    //         regex metacharacters, so later passes leave it alone.
    const escaped = pattern.replaceAll(/[.+?^${}()|[\]\\/]/g, '\\$&');
    const body = escaped
      .replaceAll(/\*\*/g, '\x00DOUBLESTAR\x00')
      .replace(/\*/g, '[^/]*')
      .split('\x00DOUBLESTAR\x00')
      .join('.*');
    const regex = new RegExp('^' + body + '$');
    return Array.from(this.files.keys()).filter((p) => regex.test(p));
  }

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return typeof content === 'string' ? content : content.toString('utf-8');
  }

  async readBuffer(path: string): Promise<Buffer> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return typeof content === 'string' ? Buffer.from(content) : content;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async readdir(path: string): Promise<string[]> {
    const prefix = path ? path + '/' : '';
    const entries = new Set<string>();

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const rest = filePath.slice(prefix.length);
        const firstPart = rest.split('/')[0];
        entries.add(firstPart);
      }
    }

    return Array.from(entries);
  }
}

/**
 * Create FileTree from path
 */
export function createFileTree(sourcePath: string): FileTree {
  return new FsFileTree(sourcePath);
}

/**
 * FileTree wrapper that filters glob results to only include specified files.
 * Metadata files (.abapgit.xml) always pass through.
 */
export class FilteredFileTree implements FileTree {
  private readonly allowedFiles: Set<string>;

  constructor(
    private readonly inner: FileTree,
    files: string[],
  ) {
    this.allowedFiles = new Set(files);
  }

  get root(): string {
    return this.inner.root;
  }

  async glob(pattern: string): Promise<string[]> {
    const all = await this.inner.glob(pattern);
    return all.filter((f) => this.isAllowed(f));
  }

  read(path: string): Promise<string> {
    return this.inner.read(path);
  }

  readBuffer(path: string): Promise<Buffer> {
    return this.inner.readBuffer(path);
  }

  exists(path: string): Promise<boolean> {
    return this.inner.exists(path);
  }

  readdir(path: string): Promise<string[]> {
    return this.inner.readdir(path);
  }

  private isAllowed(filePath: string): boolean {
    // Always allow metadata files
    if (filePath.endsWith('.abapgit.xml')) return true;

    // Check if any allowed file pattern matches
    const filename = filePath.split('/').pop()!;
    for (const allowed of this.allowedFiles) {
      // Exact path or filename match
      if (filePath === allowed || filename === allowed) return true;

      // Match companion files by {name}.{type} prefix
      // e.g., myobj.clas.xml → base "myobj.clas"
      // matches myobj.clas.abap, myobj.clas.testclasses.abap,
      //         myobj.clas.locals_def.abap, etc.
      const allowedName = allowed.split('/').pop()!;
      const allowedBase = allowedName.replace(/\.\w+$/, ''); // strip last extension
      // startsWith covers both simple companions (myobj.clas.abap)
      // and multi-extension companions (myobj.clas.testclasses.abap)
      if (filename !== allowedName && filename.startsWith(allowedBase + '.')) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Walk up from a directory to find the nearest ancestor containing .abapgit.xml.
 * Returns the resolved absolute path to the repo root, or undefined if not found.
 */
export function findAbapGitRoot(startDir: string): string | undefined {
  let dir = resolve(startDir);
  const root = resolve('/');

  while (dir !== root) {
    if (existsSync(join(dir, '.abapgit.xml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * Convert absolute file paths to paths relative to the repo root.
 */
export function resolveFilesRelativeToRoot(
  files: string[],
  cwd: string,
  repoRoot: string,
): string[] {
  return files.map((f) => {
    const abs = resolve(cwd, f);
    return relative(repoRoot, abs);
  });
}
