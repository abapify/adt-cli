import { defineConfig } from 'tsdown';
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import baseConfig from '../../tsdown.config.ts';

/**
 * Ship the pinned AFF JSON schemas inside `dist/aff-schemas/` so the
 * runtime helpers (`affSchema`, `affValidate`, `affVersions`) work after
 * `npm install` — the `git_modules` submodule is dev-only. Schema files
 * only; upstream examples remain a dev/test resource.
 */
const AFF_SCHEMA_RE = /-v\d+\.json$/;

/** Copy one type dir's `*-v{n}.json` schemas into dist — non-dirs/no-op safe. */
function copyTypeSchemas(srcDir: string, dstDir: string): void {
  let files: string[];
  try {
    files = readdirSync(srcDir);
  } catch {
    return; // not a directory (e.g. the root-level docu schema file)
  }
  for (const f of files) {
    if (!AFF_SCHEMA_RE.test(f)) continue;
    mkdirSync(dstDir, { recursive: true });
    copyFileSync(join(srcDir, f), join(dstDir, f));
  }
}

function bundleAffSchemas(): void {
  const src = '../../git_modules/abap-file-formats/file-formats';
  const dst = 'dist/aff-schemas';
  if (!existsSync(src)) {
    // A silent skip publishes a package whose schema helpers degrade to
    // "no schemas" — warn loudly so the missing bundle is visible.
    console.warn(
      'tsdown: git_modules/abap-file-formats not found — ' +
        'dist/aff-schemas will NOT be bundled (run `git submodule update --init`)',
    );
    return;
  }
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copyTypeSchemas(join(src, entry.name), join(dst, entry.name));
    } else if (AFF_SCHEMA_RE.test(entry.name)) {
      // Root-level schemas like `docu-v1.json` (shared zif_aff_* files
      // don't match `-v{n}.json` and stay dev-side)
      mkdirSync(dst, { recursive: true });
      copyFileSync(join(src, entry.name), join(dst, entry.name));
    }
  }
}

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.lib.json',
  dts: { build: false },
  external: [/^node:/, /^@abapify\//],
  onSuccess: bundleAffSchemas,
});
