import { Command } from 'commander';
import { createCliLogger } from './logger-config';
import type { Logger } from '@abapify/logger';
import { IconRegistry } from './icon-registry';

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

/**
 * Detailed error handler for import commands (transport / package).
 * Prints error message, code, HTTP status, and cause then exits.
 * Stack traces are only shown when --debug is enabled.
 */
export function handleImportError(error: unknown, debug = false): never {
  const toStr = (v: unknown): string => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch {
        // Error objects occasionally have circular refs; don't let
        // the import error handler itself crash while formatting.
        return String(v);
      }
    }
    return String(v);
  };

  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorCode =
    error instanceof Error && 'code' in error
      ? (error as { code: unknown }).code
      : 'UNKNOWN';
  const errorStatus =
    error instanceof Error && 'status' in error
      ? (error as { status: unknown }).status
      : '';
  const cause =
    error instanceof Error && 'cause' in error
      ? (error as { cause: unknown }).cause
      : null;

  console.error(`❌ Import failed: ${errorMsg}`);
  if (errorCode && errorCode !== 'UNKNOWN') {
    console.error(`   Error code: ${toStr(errorCode)}`);
  }
  if (errorStatus) {
    console.error(`   HTTP status: ${toStr(errorStatus)}`);
  }
  if (cause) {
    const causeMsg = cause instanceof Error ? cause.message : toStr(cause);
    const causeCode =
      cause instanceof Error && 'code' in cause
        ? (cause as { code: unknown }).code
        : '';
    const causeSuffix = causeCode ? ` (${toStr(causeCode)})` : '';
    console.error(`   Cause: ${causeMsg}${causeSuffix}`);
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
    results: { success: number; skipped: number; failed: number };
    objectsByType: Record<string, number>;
    outputPath: string;
  },
  label: string,
  identifier: string,
): void {
  console.log(`\n✅ ${label} import complete!`);
  console.log(`📦 ${label}: ${identifier}`);
  console.log(`📝 Description: ${result.description}`);
  console.log(
    `📊 Results: ${result.results.success} success, ${result.results.skipped} skipped, ${result.results.failed} failed`,
  );

  if (Object.keys(result.objectsByType).length > 0) {
    console.log(`\n📋 Objects by type:`);
    for (const [type, count] of Object.entries(result.objectsByType)) {
      const icon = IconRegistry.getIcon(type);
      console.log(`   ${icon} ${type}: ${count}`);
    }
  }

  console.log(`\n✨ Files written to: ${result.outputPath}`);
}
