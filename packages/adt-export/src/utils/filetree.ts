/**
 * FileTree implementations
 */

import {
  readFile,
  readdir,
  access,
  glob as nativeGlob,
} from 'node:fs/promises';
import { join } from 'node:path';
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
    // Simple glob matching for testing
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\./g, '\\.') +
        '$',
    );
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
