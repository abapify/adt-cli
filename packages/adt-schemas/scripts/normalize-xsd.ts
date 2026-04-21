#!/usr/bin/env npx tsx
/**
 * Normalize XSD files after extraction
 *
 * 1. Flattens model/ subfolder → moves files to parent
 * 2. Normalizes schemaLocation paths: platform:/plugin/.../model/foo.xsd → foo.xsd
 *
 * Usage: npx tsx scripts/normalize-xsd.ts [xsd-dir]
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmdirSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';

const xsdDir = process.argv[2] || '.xsd/sap';

// Pattern to match platform:/plugin/.../model/foo.xsd
const platformPattern =
  /schemaLocation="platform:\/[^"]*\/model\/([^"]+\.xsd)"/g;

// Pattern to match platform:/resource/.../model/foo.xsd
const resourcePattern =
  /schemaLocation="platform:\/resource\/[^"]*\/model\/([^"]+\.xsd)"/g;

function normalizeContent(content: string): string {
  return (
    content
      // platform:/plugin/.../model/foo.xsd → foo.xsd
      .replaceAll(platformPattern, 'schemaLocation="$1"')
      // platform:/resource/.../model/foo.xsd → foo.xsd
      .replaceAll(resourcePattern, 'schemaLocation="$1"')
  );
}

function flattenModelDir(baseDir: string): number {
  const modelDir = join(baseDir, 'model');
  if (!existsSync(modelDir)) {
    return 0;
  }

  console.log(`📦 Flattening ${modelDir} → ${baseDir}`);

  const entries = readdirSync(modelDir, { withFileTypes: true });
  let moved = 0;

  for (const entry of entries) {
    const srcPath = join(modelDir, entry.name);
    const destPath = join(baseDir, entry.name);

    if (entry.isFile()) {
      renameSync(srcPath, destPath);
      moved++;
    } else if (entry.isDirectory()) {
      // Move subdirectories too (like chkc/, chko/)
      renameSync(srcPath, destPath);
      moved++;
    }
  }

  // Remove empty model/ directory
  try {
    rmdirSync(modelDir);
    console.log(`  ✓ Removed empty model/ directory`);
  } catch {
    console.log(`  ⚠ Could not remove model/ directory (not empty?)`);
  }

  return moved;
}

function normalizeFiles(dir: string): number {
  const files = readdirSync(dir).filter((f) => f.endsWith('.xsd'));
  let modified = 0;

  for (const file of files) {
    const filePath = join(dir, file);
    const content = readFileSync(filePath, 'utf-8');
    const normalized = normalizeContent(content);

    if (normalized !== content) {
      writeFileSync(filePath, normalized);
      console.log(`  ✓ ${file}`);
      modified++;
    }
  }

  return modified;
}

function main() {
  console.log(`📁 Processing XSD files in: ${xsdDir}\n`);

  // Step 1: Flatten model/ subdirectory if it exists
  const moved = flattenModelDir(xsdDir);
  if (moved > 0) {
    console.log(`  ✓ Moved ${moved} items\n`);
  }

  // Step 2: Normalize schemaLocation paths
  console.log(`🔧 Normalizing schemaLocation paths...`);
  const modified = normalizeFiles(xsdDir);

  const total = readdirSync(xsdDir).filter((f) => f.endsWith('.xsd')).length;
  console.log(`\n✅ Done! Normalized ${modified}/${total} files`);
}

main();
