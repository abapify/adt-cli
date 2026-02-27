import { Command } from 'commander';
import { createCliLogger } from './logger-config';
import type { Logger } from '@abapify/logger';

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
