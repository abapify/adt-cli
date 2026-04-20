#!/usr/bin/env node
/**
 * openai-codegen CLI (v2).
 *
 * Parses command-line arguments into a GenerateOptions object. The actual
 * pipeline invocation is deferred — the Wave 2 integration agent will
 * connect `generate(...)` to this CLI.
 */

import { Command, Option, InvalidArgumentError } from 'commander';
import { resolveNames, NamesConfigError } from './emit/naming';
import type { NamesConfig, ResolvedNames } from './emit/naming';

// TODO(wave-2): wire this to the real emitter pipeline.
//   import { generate } from './generate';
// For now we resolve it lazily so that the CLI can be exercised in tests
// and via --help before the pipeline exists.
type GenerateFn = (options: GenerateOptions) => Promise<void> | void;

const SUPPORTED_FORMATS = ['abapgit', 'gcts'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

export interface GenerateOptions {
  input: string;
  out: string;
  names: ResolvedNames;
  formats: SupportedFormat[];
  target: string;
  description?: string;
}

interface RawCliOptions {
  input?: string;
  out?: string;
  base?: string;
  typesInterface?: string;
  operationsInterface?: string;
  className?: string;
  exceptionClass?: string;
  format?: string;
  target?: string;
  description?: string;
}

function parseFormats(raw: string): SupportedFormat[] {
  const parts = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new InvalidArgumentError(
      'at least one format is required (abapgit, gcts).',
    );
  }
  const result: SupportedFormat[] = [];
  for (const p of parts) {
    if (!(SUPPORTED_FORMATS as readonly string[]).includes(p)) {
      throw new InvalidArgumentError(
        `unknown format "${p}" (supported: ${SUPPORTED_FORMATS.join(', ')}).`,
      );
    }
    if (!result.includes(p as SupportedFormat)) {
      result.push(p as SupportedFormat);
    }
  }
  return result;
}

export function buildGenerateOptions(raw: RawCliOptions): GenerateOptions {
  if (!raw.input) {
    throw new Error('--input is required.');
  }
  if (!raw.out) {
    throw new Error('--out is required.');
  }

  const namesConfig: NamesConfig = {
    base: raw.base,
    typesInterface: raw.typesInterface,
    operationsInterface: raw.operationsInterface,
    implementationClass: raw.className,
    exceptionClass: raw.exceptionClass,
  };
  const names = resolveNames(namesConfig);

  const formats = parseFormats(raw.format ?? 'abapgit');
  const target = raw.target ?? 's4-cloud';

  return {
    input: raw.input,
    out: raw.out,
    names,
    formats,
    target,
    description: raw.description,
  };
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('openai-codegen')
    .description(
      'Deterministic OpenAPI -> ABAP client code generator (v2 pipeline).',
    )
    .requiredOption('--input <path>', 'path to the OpenAPI spec (YAML or JSON)')
    .requiredOption('--out <dir>', 'output directory')
    .option(
      '--base <name>',
      'logical base name used to derive ZCL_<BASE> / ZIF_<BASE> / ZCX_<BASE>_ERROR',
    )
    .option(
      '--types-interface <name>',
      'override for the types interface name (default: ZIF_<BASE>_TYPES)',
    )
    .option(
      '--operations-interface <name>',
      'override for the operations interface name (default: ZIF_<BASE>)',
    )
    .option(
      '--class-name <name>',
      'override for the implementation class name (default: ZCL_<BASE>)',
    )
    .option(
      '--exception-class <name>',
      'override for the exception class name (default: ZCX_<BASE>_ERROR)',
    )
    .addOption(
      new Option(
        '--format <list>',
        'comma-separated output formats (abapgit, gcts)',
      ).default('abapgit'),
    )
    .option('--target <profile>', 'target profile (e.g. s4-cloud)', 's4-cloud')
    .option(
      '--description <text>',
      'description stored in the generated CLAS/INTF XML',
    )
    .action(async (opts: RawCliOptions) => {
      const options = buildGenerateOptions(opts);
      const generate = await loadGenerate();
      if (!generate) {
        console.log('openai-codegen v2 pipeline not yet wired');
        // Surface the resolved options as a sanity hint.
        console.log(
          `  input=${options.input} out=${options.out} target=${options.target} formats=${options.formats.join(',')}`,
        );
        console.log(
          `  class=${options.names.implementationClass} ops=${options.names.operationsInterface} types=${options.names.typesInterface} error=${options.names.exceptionClass}`,
        );
        return;
      }
      await generate(options);
    });

  // Do not let commander terminate the process during tests.
  program.exitOverride();
  return program;
}

async function loadGenerate(): Promise<GenerateFn | undefined> {
  // Dynamic import so the CLI can be used before the pipeline is wired.
  // The module path is computed to prevent TypeScript from failing when the
  // file is not yet on disk.
  const modulePath = './generate';
  try {
    const mod = (await import(/* @vite-ignore */ modulePath)) as {
      generate?: GenerateFn;
    };
    return typeof mod.generate === 'function' ? mod.generate : undefined;
  } catch {
    return undefined;
  }
}

async function main(argv: string[]): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof NamesConfigError) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }
    // commander's CommanderError carries a code like 'commander.helpDisplayed'
    const anyErr = err as { code?: string; message?: string };
    if (
      anyErr.code === 'commander.helpDisplayed' ||
      anyErr.code === 'commander.version' ||
      anyErr.code === 'commander.help'
    ) {
      return;
    }
    if (anyErr.code?.startsWith('commander.')) {
      // commander already printed its own error message
      process.exit(1);
    }
    console.error(
      `error: ${anyErr.message ?? (err instanceof Error ? err.message : String(err))}`,
    );
    process.exit(1);
  }
}

// Only run when invoked directly (not when imported by tests or the public API).
const invokedDirectly = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    const url = import.meta.url;
    if (!url.startsWith('file:')) return false;
    // Resolve the URL path component and compare with argv[1].
    const urlPath = decodeURIComponent(new URL(url).pathname);
    // argv[1] is usually an absolute path to the launched file.
    return urlPath === entry || urlPath.endsWith('/cli.mjs');
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  void main(process.argv);
}
