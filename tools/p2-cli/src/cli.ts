#!/usr/bin/env node
/**
 * P2 CLI - Eclipse P2 Repository Tools
 *
 * Commands:
 *   p2 download <url>     Download plugins from P2 repository
 *   p2 extract <input>    Extract files from JAR archives
 *   p2 decompile <input>  Decompile Java class files
 */

import { Command } from 'commander';
import { download } from './commands/download';
import { extractJars } from './commands/extract';
import { decompile } from './commands/decompile';

const program = new Command();

program
  .name('p2')
  .description(
    'CLI for Eclipse P2 repositories - download, extract, and decompile plugins',
  )
  .version('0.1.0');

// Download command
program
  .command('download <url>')
  .description('Download plugins from a P2 repository')
  .option('-o, --output <dir>', 'Output directory', './p2-download')
  .option(
    '-f, --filter <patterns>',
    'Filter plugins by ID pattern (comma-separated)',
    '',
  )
  .option('-e, --extract', 'Also extract files after download')
  .option('--extract-output <dir>', 'Output directory for extraction')
  .option(
    '--extract-patterns <patterns>',
    'File patterns to extract (comma-separated, default: all)',
  )
  .action(async (url: string, opts) => {
    await download(url, {
      output: opts.output,
      filter: opts.filter || undefined,
      extract: opts.extract,
      extractOutput: opts.extractOutput,
      extractPatterns: opts.extractPatterns
        ?.split(',')
        .map((p: string) => p.trim()),
    });
  });

// Extract command
program
  .command('extract <input>')
  .description('Extract files from JAR archives (preserves package structure)')
  .option('-o, --output <dir>', 'Output directory', './extracted')
  .option(
    '-p, --patterns <patterns>',
    'File patterns to extract (comma-separated, default: all)',
  )
  .option('-v, --verbose', 'Verbose output')
  .action(async (input: string, opts) => {
    await extractJars(input, {
      output: opts.output,
      patterns: opts.patterns
        ? opts.patterns.split(',').map((p: string) => p.trim())
        : undefined,
      verbose: opts.verbose,
    });
  });

// Decompile command
program
  .command('decompile <input>')
  .description('Decompile Java class files or JAR files')
  .option('-o, --output <dir>', 'Output directory', './decompiled')
  .option(
    '-f, --filter <patterns>',
    'Filter JARs by name pattern (comma-separated)',
  )
  .option(
    '-d, --decompiler <name>',
    'Decompiler to use (cfr, procyon, fernflower)',
  )
  .option('-v, --verbose', 'Verbose output')
  .action(async (input: string, opts) => {
    await decompile(input, {
      output: opts.output,
      filter: opts.filter,
      decompiler: opts.decompiler,
      verbose: opts.verbose,
    });
  });

program.parse();
