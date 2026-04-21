/**
 * Assertions derived from `parse()`. Useful for downstream consumers
 * (generators, linters, CI gates) that want to guarantee their output
 * stays inside the structural subset of ABAP OO that `aclass`
 * understands, without writing the same filtering logic each time.
 */
import { parse } from './parser';
import type { ParseError } from './errors';

export class AclassParseError extends Error {
  public readonly source: string;
  public readonly errors: readonly ParseError[];
  constructor(
    fileLabel: string,
    errors: readonly ParseError[],
    source: string,
  ) {
    super(
      `aclass: ${errors.length} parse error${errors.length === 1 ? '' : 's'} in ${fileLabel}:\n` +
        errors
          .slice(0, 10)
          .map((e) => `  [${e.line}:${e.column}] ${e.message}`)
          .join('\n'),
    );
    this.name = 'AclassParseError';
    this.source = source;
    this.errors = errors;
  }
}

/**
 * Throw `AclassParseError` if the source has any lex / parse errors.
 * `fileLabel` is included in the message so CI output points at the
 * offending file without the caller having to format it.
 *
 * Intended use in test suites:
 *
 * ```ts
 * for (const f of generated) {
 *   assertCleanParse(readFileSync(f, 'utf8'), f);
 * }
 * ```
 */
export function assertCleanParse(source: string, fileLabel = '<source>'): void {
  const { errors } = parse(source);
  if (errors.length === 0) return;
  throw new AclassParseError(fileLabel, errors, source);
}
