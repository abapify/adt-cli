/**
 * Companion-file deserialization tests — FORM tdlines_{lang}.xml,
 * SMIM binary payload, IATU .html side file.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deserialize } from '../../src/lib/deserializer.ts';
import type { FileTree } from '@abapify/adt-plugin';
import * as fs from 'node:fs';
import * as path from 'node:path';

function createMockFileTree(fixturesDir: string): FileTree {
  const files = new Map<string, string>();

  function collectFiles(dir: string, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        collectFiles(fullPath, relativePath);
      } else {
        files.set(relativePath, fs.readFileSync(fullPath, 'utf-8'));
      }
    }
  }
  collectFiles(fixturesDir);

  function matchGlob(pattern: string, filePath: string): boolean {
    const toRegex = (glob: string): string =>
      glob.replaceAll(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll(/\*/g, '[^/]*');
    if (pattern.startsWith('**/')) {
      const suffixRegex = toRegex(pattern.slice(3));
      return new RegExp(`^(.*\\/)?${suffixRegex}$`).test(filePath);
    }
    return new RegExp(`^${toRegex(pattern)}$`).test(filePath);
  }

  return {
    root: fixturesDir,
    glob: async (pattern: string) =>
      Array.from(files.keys()).filter((f) => matchGlob(pattern, f)),
    read: async (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) throw new Error(`File not found: ${filePath}`);
      return content;
    },
    readBuffer: async (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) throw new Error(`File not found: ${filePath}`);
      return Buffer.from(content);
    },
    exists: async (filePath: string) => files.has(filePath),
    readdir: async (dirPath: string) => {
      const prefix = dirPath ? `${dirPath}/` : '';
      const entries = new Set<string>();
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          entries.add(filePath.slice(prefix.length).split('/')[0]);
        }
      }
      return Array.from(entries);
    },
  };
}

const mockClient = {} as never;
const fixturesDir = path.join(import.meta.dirname, '..', 'fixtures');

async function collect(fileTree: FileTree) {
  const objects = [];
  for await (const obj of deserialize(fileTree, mockClient)) {
    objects.push(obj);
  }
  return objects;
}

describe('companion file deserialization', () => {
  it('FORM: restores tdlines from {name}.form.tdlines_e.xml', async () => {
    const objects = await collect(
      createMockFileTree(path.join(fixturesDir, 'form')),
    );

    assert.strictEqual(objects.length, 1);
    const data = (objects[0] as { data?: Record<string, unknown> }).data ?? {};
    assert.strictEqual(objects[0].name, 'ZTEST_FORM');
    assert.ok(data.tdlines);
    const tdlines = data.tdlines as Record<
      string,
      Array<{ line?: string; format?: string }>
    >;
    assert.strictEqual(tdlines.EN.length, 2);
    assert.deepStrictEqual(tdlines.EN[0], {
      line: 'Hello from tdlines',
      format: '*',
    });
  });

  it('SMIM: restores base64 content from {name}.smim.{filename}', async () => {
    const objects = await collect(
      createMockFileTree(path.join(fixturesDir, 'smim')),
    );

    assert.strictEqual(objects.length, 1);
    const data = (objects[0] as { data?: Record<string, unknown> }).data ?? {};
    assert.strictEqual(data.fileName, 'ztest_mime.png');
    assert.strictEqual(typeof data.content, 'string');
    assert.ok(Buffer.from(data.content as string, 'base64').length > 0);
  });

  it('IATU: restores html from {name}.iatu.html', async () => {
    const objects = await collect(
      createMockFileTree(path.join(fixturesDir, 'iatu')),
    );

    assert.strictEqual(objects.length, 1);
    const data = (objects[0] as { data?: Record<string, unknown> }).data ?? {};
    assert.strictEqual(objects[0].name, 'ZTEST_TPL');
    assert.strictEqual(
      data.html,
      '<html><body><h1>Test template</h1></body></html>',
    );
  });
});
