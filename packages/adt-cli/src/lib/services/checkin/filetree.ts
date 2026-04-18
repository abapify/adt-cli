/**
 * FileTree implementation used by the CheckinService.
 *
 * Mirrors the `FsFileTree` in `@abapify/adt-export` but kept local so the
 * checkin feature doesn't drag an export-time dependency back into
 * `adt-cli` (which would violate the module-boundary rules between
 * adt-cli and plugin-like packages).
 */
import {
  readFile,
  readdir,
  access,
  glob as nativeGlob,
} from 'node:fs/promises';
import { join } from 'node:path';
import type { FileTree } from '@abapify/adt-plugin';

class FsFileTree implements FileTree {
  constructor(public readonly root: string) {}

  async glob(pattern: string): Promise<string[]> {
    const results: string[] = [];
    for await (const path of nativeGlob(pattern, { cwd: this.root })) {
      results.push(path);
    }
    return results;
  }

  async read(path: string): Promise<string> {
    const content = await readFile(join(this.root, path), 'utf-8');
    return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  }

  async readBuffer(path: string): Promise<Buffer> {
    return readFile(join(this.root, path));
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(join(this.root, path));
      return true;
    } catch {
      return false;
    }
  }

  async readdir(path: string): Promise<string[]> {
    return readdir(path ? join(this.root, path) : this.root);
  }
}

export function createFsFileTree(root: string): FileTree {
  return new FsFileTree(root);
}
