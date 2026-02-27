#!/usr/bin/env node
/**
 * ts-xsd Codegen CLI
 *
 * Usage:
 *   ts-xsd codegen [--config=ts-xsd.config.ts] [--verbose]
 *   ts-xsd codegen <input.xsd> [output.ts] [--name=SchemaName]
 *
 * Config-based (recommended):
 *   ts-xsd codegen                          # Uses ts-xsd.config.ts in cwd
 *   ts-xsd codegen --config=my-config.ts    # Uses custom config
 *   ts-xsd codegen --verbose                # Verbose output
 *
 * Single-file (legacy):
 *   ts-xsd codegen person.xsd
 *   ts-xsd codegen person.xsd ./generated/person-schema.ts
 *   ts-xsd codegen person.xsd --name=PersonSchema
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateSchemaFile } from './generate';
import { runCodegen } from './runner';
import type { CodegenConfig } from './types';

interface ConfigModeOptions {
  mode: 'config';
  config: string;
  verbose?: boolean;
}

interface SingleFileModeOptions {
  mode: 'single';
  input: string;
  output: string;
  name: string;
  verbose?: boolean;
}

type CliOptions = ConfigModeOptions | SingleFileModeOptions;

function parseArgs(args: string[]): CliOptions {
  const positional: string[] = [];
  let config: string | undefined;
  let verbose = false;
  let name: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--config=')) {
      config = arg.slice(9);
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg.startsWith('--name=')) {
      name = arg.slice(7);
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  // If first positional arg is an XSD file, use single-file mode
  if (positional[0]?.endsWith('.xsd')) {
    const input = positional[0];
    const defaultOutput = input.replace(/\.xsd$/i, '-schema.ts');
    const output = positional[1] || defaultOutput;
    const defaultName =
      basename(input, '.xsd')
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^./, (s) => s.toLowerCase()) + 'Schema';

    return {
      mode: 'single',
      input: resolve(input),
      output: resolve(output),
      name: name || defaultName,
      verbose,
    };
  }

  // Config-based mode
  return {
    mode: 'config',
    config: config || 'ts-xsd.config.ts',
    verbose,
  };
}

async function runConfigMode(options: ConfigModeOptions) {
  const configPath = resolve(options.config);

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.error(
      '\nCreate a ts-xsd.config.ts file or specify --config=path/to/config.ts',
    );
    process.exit(1);
  }

  console.log(`📦 Loading config: ${configPath}\n`);

  // Dynamic import of config file
  const configUrl = pathToFileURL(configPath).href;
  const configModule = await import(configUrl);
  const config: CodegenConfig = configModule.default;

  const result = await runCodegen(config, {
    rootDir: dirname(configPath),
    verbose: options.verbose,
  });

  console.log(`\n📊 Summary:`);
  console.log(`  - Schemas processed: ${result.schemas.length}`);
  console.log(`  - Files generated: ${result.files.length}`);
  console.log(`  - Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.error('\n❌ Errors:');
    for (const err of result.errors) {
      console.error(`  - ${err.schema || 'unknown'}: ${err.error.message}`);
    }
    process.exit(1);
  }

  console.log('\n✅ Codegen complete!');
}

function runSingleFileMode(options: SingleFileModeOptions) {
  console.log(`Reading: ${options.input}`);
  const xsdContent = readFileSync(options.input, 'utf-8');

  console.log(`Generating schema: ${options.name}`);
  const tsContent = generateSchemaFile(xsdContent, {
    name: options.name,
    comment: `Source: ${basename(options.input)}`,
  });

  mkdirSync(dirname(options.output), { recursive: true });

  console.log(`Writing: ${options.output}`);
  writeFileSync(options.output, tsContent);

  console.log(`Done! Generated ${tsContent.length} characters`);
  console.log(`\nUsage in TypeScript:`);
  console.log(
    `  import { ${options.name} } from './${basename(options.output, '.ts')}';`,
  );
  console.log(`  import type { InferSchema } from 'ts-xsd';`);
  console.log(`  type MyType = InferSchema<typeof ${options.name}>;`);
}

function showHelp() {
  console.log(`
ts-xsd Codegen CLI

Usage:
  ts-xsd codegen [options]              Config-based generation (recommended)
  ts-xsd codegen <input.xsd> [output]   Single-file generation (legacy)

Options:
  --config=FILE   Config file path (default: ts-xsd.config.ts)
  --verbose, -v   Verbose output
  --name=NAME     Schema variable name (single-file mode only)
  --help, -h      Show this help

Examples:
  # Config-based (recommended)
  ts-xsd codegen                          # Uses ts-xsd.config.ts
  ts-xsd codegen --config=my-config.ts    # Custom config
  ts-xsd codegen --verbose                # With verbose output

  # Single-file (legacy)
  ts-xsd codegen person.xsd
  ts-xsd codegen person.xsd ./out/person.ts --name=PersonSchema
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (options.mode === 'config') {
    await runConfigMode(options);
  } else {
    runSingleFileMode(options);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
