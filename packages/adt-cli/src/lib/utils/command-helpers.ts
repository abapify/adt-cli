import { Command } from 'commander';
import { createCliLogger } from './logger-config';
import type { Logger } from '@abapify/logger';
import { IconRegistry } from './icon-registry';
import { asText } from './text';

/**
 * Extract global options from a command by traversing up to the root
 */
export function getGlobalOptions(command: Command): any {
  let rootCmd = command.parent || command;
  while (rootCmd.parent) {
    rootCmd = rootCmd.parent;
  }
  return rootCmd.opts();
}

/**
 * Create a logger for a command using global options
 */
export function createCommandLogger(command: Command): Logger {
  const globalOptions = getGlobalOptions(command);
  return createCliLogger({ verbose: globalOptions.verbose });
}

/**
 * Create a component-specific logger for a command
 */
export function createComponentLogger(
  command: Command,
  component: string,
): Logger {
  const logger = createCommandLogger(command);
  return logger.child({ component });
}

/**
 * Standard error handler for commands
 */
export function handleCommandError(error: unknown, operation: string): never {
  console.error(
    `❌ ${operation} failed:`,
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

/** Stringify an unknown error field safely (avoids "[object Object]"). */
function toStr(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      // Error objects occasionally have circular refs; don't let
      // the import error handler itself crash while formatting.
      return asText(v);
    }
  }
  return asText(v);
}

/** Read a named optional property from an Error-like value. */
function errorField(error: unknown, field: string): unknown {
  return error instanceof Error && field in error
    ? (error as Record<string, unknown>)[field]
    : undefined;
}

/** Format the "Cause: …" line for a non-null cause value. */
function formatCauseLine(cause: unknown): string {
  const causeMsg = cause instanceof Error ? cause.message : toStr(cause);
  const causeCode = errorField(cause, 'code');
  const causeSuffix = causeCode ? ` (${toStr(causeCode)})` : '';
  return `   Cause: ${causeMsg}${causeSuffix}`;
}

/**
 * Detailed error handler for import commands (transport / package).
 * Prints error message, code, HTTP status, and cause then exits.
 * Stack traces are only shown when --debug is enabled.
 */
export function handleImportError(error: unknown, debug = false): never {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorCode = errorField(error, 'code') ?? 'UNKNOWN';
  const errorStatus = errorField(error, 'status');
  const cause = errorField(error, 'cause');

  console.error(`❌ Import failed: ${errorMsg}`);
  if (errorCode && errorCode !== 'UNKNOWN') {
    console.error(`   Error code: ${toStr(errorCode)}`);
  }
  if (errorStatus) {
    console.error(`   HTTP status: ${toStr(errorStatus)}`);
  }
  if (cause) {
    console.error(formatCauseLine(cause));
  }
  if (debug && error instanceof Error && error.stack) {
    console.error(`   Stack: ${error.stack}`);
  }
  process.exit(1);
}

/**
 * Display import results in a standard format.
 *
 * Used by both `import transport` and `import package` commands to
 * avoid duplicating the same output formatting code.
 */
export function displayImportResults(
  result: {
    description: string;
    results: {
      success: number;
      skipped: number;
      failed: number;
      deleted?: number;
    };
    objectsByType: Record<string, number>;
    outputPath: string;
    filesRemoved?: string[];
  },
  label: string,
  identifier: string,
): void {
  console.log(`\n✅ ${label} import complete!`);
  console.log(`📦 ${label}: ${identifier}`);
  console.log(`📝 Description: ${result.description}`);

  const deletedPart =
    result.results.deleted != null && result.results.deleted > 0
      ? `, ${result.results.deleted} deleted`
      : '';
  console.log(
    `📊 Results: ${result.results.success} success, ${result.results.skipped} skipped, ${result.results.failed} failed${deletedPart}`,
  );

  if (Object.keys(result.objectsByType).length > 0) {
    console.log(`\n📋 Objects by type:`);
    for (const [type, count] of Object.entries(result.objectsByType)) {
      const icon = IconRegistry.getIcon(type);
      console.log(`   ${icon} ${type}: ${count}`);
    }
  }

  if (result.filesRemoved && result.filesRemoved.length > 0) {
    console.log(`\n🗑️  Files removed (${result.filesRemoved.length}):`);
    for (const f of result.filesRemoved) {
      console.log(`   - ${f}`);
    }
  }

  console.log(`\n✨ Files written to: ${result.outputPath}`);
}

/**
 * Parse a comma-separated CLI option string into a single string or an array.
 *
 * - Returns `undefined` when the input is falsy or contains no non-empty tokens.
 * - Returns a `string` when exactly one token is present (preserves the scalar
 *   form expected by selector types such as {@link TransportObjectSelector}).
 * - Returns `string[]` when two or more tokens are present.
 * - When `upperCase` is true every token is uppercased before returning.
 *
 * SAP object names and types do **not** contain commas, so this is safe to
 * use for all CTS filter options.
 *
 * @example
 * parseFilterOption('D')           // → 'D'
 * parseFilterOption('D,K')         // → ['D', 'K']
 * parseFilterOption('CLAS, TABL')  // → ['CLAS', 'TABL']
 * parseFilterOption(undefined)     // → undefined
 */
export function parseFilterOption(
  value: string | undefined,
  upperCase = false,
): string | string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(',')
    .map((s) => (upperCase ? s.trim().toUpperCase() : s.trim()))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : parts;
}

export { parseTransportNumbers } from '@abapify/adt-services';
