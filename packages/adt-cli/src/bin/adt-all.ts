#!/usr/bin/env node

/**
 * Bundled CLI entry point — statically imports all built-in plugins so that
 * `bun build --compile` can embed every module into a single standalone
 * executable with no external dependencies.
 *
 * Build:
 *   npx nx bundle adt-cli
 *
 * Or manually:
 *   bun build --compile ./src/bin/adt-all.ts \
 *     --outfile ./dist/adt \
 *     --target bun
 */

// Set CLI mode before importing any modules
process.env.ADT_CLI_MODE = 'true';

// Static imports so Bun's bundler can embed these modules at compile time
import { codegenCommand } from '@abapify/adt-codegen/commands/codegen';
import { atcCommand } from '@abapify/adt-atc/commands/atc';
import { exportCommand } from '@abapify/adt-export/commands/export';
import { diffCommand } from '@abapify/adt-diff/commands/diff';

import { main } from '../lib/cli';

main({
  preloadedPlugins: [codegenCommand, atcCommand, exportCommand, diffCommand],
}).catch((error) => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
});
