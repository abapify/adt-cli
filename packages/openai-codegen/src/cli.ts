#!/usr/bin/env node
/**
 * openai-codegen CLI (v2).
 *
 * Parses command-line flags and calls the `generate()` pipeline for each
 * requested output format.
 */

import { Command, Option, InvalidArgumentError } from 'commander';
import { resolveNames, NamesConfigError } from './emit/naming';
import type { NamesConfig, ResolvedNames } from './emit/naming';
import {
  generate,
  type GenerateOptions as PipelineGenerateOptions,
  type GenerateResult,
} from './generate';
import { resolve as resolvePath } from 'node:path';

const SUPPORTED_FORMATS = ['abapgit', 'gcts'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

/**
 * CLI-facing resolved options shape. Exposes both the raw {@link NamesConfig}
 * (to pass to `generate()`) and the resolved names (so tests / callers can
 * inspect final artifact names without re-resolving).
 */
export interface GenerateOptions {
  input: string;
  out: string;
  namesConfig: NamesConfig;
  names: ResolvedNames;
  formats: readonly SupportedFormat[];
  target: 's4-cloud' | 's4-onprem-modern' | 'on-prem-classic';
  description?: string;
}

/** Alias kept for newer code that prefers a run-style name. */
export type CliRunOptions = GenerateOptions;

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

function parseTarget(raw: string): CliRunOptions['target'] {
  const normalized = raw.trim().toLowerCase();
  if (
    normalized !== 's4-cloud' &&
    normalized !== 's4-onprem-modern' &&
    normalized !== 'on-prem-classic'
  ) {
    throw new InvalidArgumentError(
      `unknown target "${raw}" (supported: s4-cloud, s4-onprem-modern, on-prem-classic).`,
    );
  }
  return normalized as CliRunOptions['target'];
}

export function buildCliRunOptions(raw: RawCliOptions): CliRunOptions {
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
  // Validate and resolve eagerly so the CLI fails fast with a useful message
  // AND so tests / downstream code can read resolved global names via `.names`.
  const names = resolveNames(namesConfig);

  const formats = parseFormats(raw.format ?? 'abapgit');
  const target = parseTarget(raw.target ?? 's4-cloud');

  return {
    input: raw.input,
    out: raw.out,
    namesConfig,
    names,
    formats,
    target,
    description: raw.description,
  };
}

/**
 * Back-compat shim: older callers used `buildGenerateOptions` and relied on
 * the `GenerateOptions` export. Keep both names working — the modern path
 * is `buildCliRunOptions`.
 */
export const buildGenerateOptions = buildCliRunOptions;

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
      const runOptions = buildCliRunOptions(opts);
      const baseOutDir = resolvePath(process.cwd(), runOptions.out);
      const results: Array<{
        format: SupportedFormat;
        result: GenerateResult;
      }> = [];
      for (const format of runOptions.formats) {
        const formatOutDir =
          runOptions.formats.length === 1
            ? baseOutDir
            : resolvePath(baseOutDir, format);
        const genOpts: PipelineGenerateOptions = {
          input: runOptions.input,
          outDir: formatOutDir,
          format,
          target: runOptions.target,
          names: runOptions.namesConfig,
          description: runOptions.description,
        };
        const result = await generate(genOpts);
        results.push({ format, result });
        process.stdout.write(
          `[openai-codegen] ${format}: wrote ${result.files.length} files ` +
            `(${result.typeCount} types, ${result.operationCount} operations) ` +
            `-> ${formatOutDir}\n`,
        );
      }
    });

  // Do not let commander terminate the process during tests.
  program.exitOverride();
  return program;
}

async function main(argv: string[]): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof NamesConfigError) {
      process.stderr.write(`error: ${err.message}\n`);
      process.exit(1);
    }
    const anyErr = err as { code?: string; message?: string };
    if (
      anyErr.code === 'commander.helpDisplayed' ||
      anyErr.code === 'commander.version' ||
      anyErr.code === 'commander.help'
    ) {
      return;
    }
    if (anyErr.code?.startsWith('commander.')) {
      process.exit(1);
    }
    process.stderr.write(
      `error: ${anyErr.message ?? (err instanceof Error ? err.message : String(err))}\n`,
    );
    process.exit(1);
  }
}

// Only run when invoked directly.
const invokedDirectly = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    const url = import.meta.url;
    if (!url.startsWith('file:')) return false;
    const urlPath = decodeURIComponent(new URL(url).pathname);
    return urlPath === entry || urlPath.endsWith('/cli.mjs');
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  void main(process.argv);
}
