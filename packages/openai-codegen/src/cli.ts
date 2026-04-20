#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { generate } from './generate';
import type { OutputFormat } from './format/index';
import type { TargetProfileId } from './profiles/index';

/** Parse --format=abapgit,gcts into an array with strict validation. */
function parseFormats(raw: string): OutputFormat[] {
  const allowed: OutputFormat[] = ['abapgit', 'gcts'];
  const parts = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new Error('--format must contain at least one value');
  }
  for (const p of parts) {
    if (!allowed.includes(p as OutputFormat)) {
      throw new Error(
        `invalid --format '${p}'. expected one of: ${allowed.join(', ')}`,
      );
    }
  }
  // Deduplicate, preserving order.
  return Array.from(new Set(parts)) as OutputFormat[];
}

function parseTarget(raw: string): TargetProfileId {
  const allowed: TargetProfileId[] = [
    's4-cloud',
    's4-onprem-modern',
    'on-prem-classic',
  ];
  const normalized = raw.trim().toLowerCase() as TargetProfileId;
  if (!allowed.includes(normalized)) {
    throw new Error(
      `invalid --target '${raw}'. expected one of: ${allowed.join(', ')}`,
    );
  }
  return normalized;
}

const program = new Command();

program
  .name('openai-codegen')
  .description(
    'Deterministic OpenAPI → ABAP client code generator. Emits a single zero-dependency ABAP class per spec.',
  )
  .version('0.1.0')
  .requiredOption(
    '-i, --input <path>',
    'path or URL to an OpenAPI spec (JSON or YAML)',
  )
  .requiredOption('-o, --out <dir>', 'output directory')
  .option(
    '-t, --target <profile>',
    "target SAP system profile ('s4-cloud' is the only one implemented in v1)",
    's4-cloud',
  )
  .option(
    '-f, --format <list>',
    "comma-separated output layouts: 'abapgit', 'gcts', or 'abapgit,gcts'",
    'abapgit',
  )
  .requiredOption(
    '-c, --class-name <name>',
    'ABAP class name, e.g. ZCL_PETSTORE3_CLIENT',
  )
  .requiredOption(
    '-p, --type-prefix <prefix>',
    "lower-case ABAP type prefix (without 'ty_' / trailing underscore), e.g. 'ps3'",
  )
  .option(
    '-d, --description <text>',
    'short description used in the .clas.xml DESCRIPT',
  )
  .action(async (rawOpts: Record<string, string>) => {
    try {
      const target = parseTarget(rawOpts['target'] ?? 's4-cloud');
      const formats = parseFormats(rawOpts['format'] ?? 'abapgit');
      const outDir = resolve(process.cwd(), rawOpts['out']!);

      for (const format of formats) {
        const formatOutDir =
          formats.length === 1 ? outDir : resolve(outDir, format);
        const result = await generate({
          input: rawOpts['input']!,
          outDir: formatOutDir,
          target,
          format,
          className: rawOpts['className']!,
          typePrefix: rawOpts['typePrefix']!,
          description: rawOpts['description'],
        });
        process.stdout.write(
          `[openai-codegen] ${format}: wrote ${result.files.length} files ` +
            `(${result.typeCount} types, ${result.operationCount} operations) ` +
            `→ ${formatOutDir}\n`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[openai-codegen] error: ${msg}\n`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[openai-codegen] fatal: ${msg}\n`);
  process.exit(1);
});
