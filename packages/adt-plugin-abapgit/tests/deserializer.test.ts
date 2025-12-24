/**
 * Deserializer tests - verify fromAbapGit mapping
 */

import { describe, it, expect } from 'vitest';
import { deserialize } from '../src/lib/deserializer.ts';
import type { FileTree } from '@abapify/adt-plugin';
import * as fs from 'fs';
import * as path from 'path';

// Mock FileTree that reads from fixtures directory
function createMockFileTree(fixturesDir: string): FileTree {
  const files = new Map<string, string>();

  // Recursively collect all files
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

  // Simple glob implementation for testing
  function matchGlob(pattern: string, filePath: string): boolean {
    // Handle **/*.xml pattern - should match both dir/file.xml and file.xml
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3); // Remove **/
      const suffixRegex = suffix.replace(/\./g, '\\.').replace(/\*/g, '[^/]*');
      // Match either at root or in any subdirectory
      return new RegExp(`^(.*\\/)?${suffixRegex}$`).test(filePath);
    }
    // Simple * glob
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*');
    return new RegExp(`^${regexPattern}$`).test(filePath);
  }

  return {
    root: fixturesDir,
    glob: async (pattern: string) => {
      return Array.from(files.keys()).filter((f) => matchGlob(pattern, f));
    },
    read: async (filePath: string) => {
      const content = files.get(filePath);
      if (!content) throw new Error(`File not found: ${filePath}`);
      return content;
    },
    readBuffer: async (filePath: string) => {
      const content = files.get(filePath);
      if (!content) throw new Error(`File not found: ${filePath}`);
      return Buffer.from(content);
    },
    exists: async (filePath: string) => files.has(filePath),
    readdir: async (dirPath: string) => {
      const prefix = dirPath ? `${dirPath}/` : '';
      const entries = new Set<string>();
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          const rest = filePath.slice(prefix.length);
          const firstPart = rest.split('/')[0];
          entries.add(firstPart);
        }
      }
      return Array.from(entries);
    },
  };
}

// Mock ADT client (not used for deserialization, but required by signature)
const mockClient = {} as any;

describe('deserializer', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  it('should deserialize CLAS from fixture', async () => {
    // Create FileTree with just the clas fixture
    const fileTree = createMockFileTree(path.join(fixturesDir, 'clas'));

    const objects = [];
    for await (const obj of deserialize(fileTree, mockClient)) {
      objects.push(obj);
    }

    expect(objects).toHaveLength(1);
    expect(objects[0].name).toBe('ZCL_AGE_SAMPLE_CLASS');
    // kind returns human-readable name, not type code
    expect(objects[0].kind).toBe('Class');
  });

  it('should deserialize INTF from fixture', async () => {
    const fileTree = createMockFileTree(path.join(fixturesDir, 'intf'));

    const objects = [];
    for await (const obj of deserialize(fileTree, mockClient)) {
      objects.push(obj);
    }

    expect(objects).toHaveLength(1);
    expect(objects[0].name).toBe('ZIF_AGE_TEST');
    expect(objects[0].kind).toBe('Interface');
  });

  it('should deserialize DEVC from fixture', async () => {
    const fileTree = createMockFileTree(path.join(fixturesDir, 'devc'));

    const objects = [];
    for await (const obj of deserialize(fileTree, mockClient)) {
      objects.push(obj);
    }

    expect(objects).toHaveLength(1);
    // DEVC name comes from filename (uppercase) since it's not in XML
    expect(objects[0].name).toBe('PACKAGE');
    expect(objects[0].kind).toBe('Package');
  });

  it('should deserialize multiple objects from mixed fixtures', async () => {
    const fileTree = createMockFileTree(fixturesDir);

    const objects = [];
    for await (const obj of deserialize(fileTree, mockClient)) {
      objects.push(obj);
    }

    // Should have CLAS, INTF, DEVC (DOMA and DTEL don't have handlers yet)
    const kinds = objects.map((o) => o.kind);
    expect(kinds).toContain('Class');
    expect(kinds).toContain('Interface');
    expect(kinds).toContain('Package');
  });
});
