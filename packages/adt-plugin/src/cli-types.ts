/**
 * CLI Command Plugin Types
 *
 * CLI-agnostic interface for command plugins.
 * Plugins implement this interface without depending on any CLI framework (Commander, yargs, etc.)
 * The CLI shell (adt-cli) translates these definitions to the actual CLI framework.
 */

/**
 * CLI option definition
 */
export interface CliOption {
  /**
   * Option flags in Commander format
   * @example '-o, --output <dir>' or '--verbose'
   */
  flags: string;

  /**
   * Description shown in help
   */
  description: string;

  /**
   * Default value if not provided
   */
  default?: string | boolean | number;

  /**
   * Whether this option is required
   */
  required?: boolean;
}

/**
 * CLI argument definition
 */
export interface CliArgument {
  /**
   * Argument name
   * Use <name> for required, [name] for optional
   * @example '<path>' or '[config]'
   */
  name: string;

  /**
   * Description shown in help
   */
  description: string;

  /**
   * Default value if not provided (only for optional arguments)
   */
  default?: string;
}

/**
 * Context provided to command execution
 */
export interface CliContext {
  /**
   * Current working directory
   */
  cwd: string;

  /**
   * Loaded configuration from adt.config.ts (if present)
   */
  config: Record<string, unknown>;

  /**
   * Logger instance
   */
  logger: CliLogger;

  /**
   * ADT client factory (provided by adt-cli when authenticated)
   * Returns an authenticated ADT client for making API calls.
   * Only available when running within adt-cli context.
   * Note: This is async - plugins must await the result.
   */
  getAdtClient?: () => Promise<unknown>;

  /**
   * ADT system name for hyperlinks (e.g., "S0D")
   * Used to construct adt:// protocol links.
   * Only available when running within adt-cli context.
   */
  adtSystemName?: string;
}

/**
 * Simple logger interface (CLI-agnostic)
 */
export interface CliLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * CLI Command Plugin interface
 *
 * Implement this interface to create a CLI command plugin.
 * The plugin is CLI-agnostic - it doesn't know about Commander or any other CLI framework.
 *
 * @example
 * ```typescript
 * import type { CliCommandPlugin } from '@abapify/adt-plugin';
 *
 * export const myCommand: CliCommandPlugin = {
 *   name: 'my-command',
 *   description: 'Does something useful',
 *   options: [
 *     { flags: '-o, --output <dir>', description: 'Output directory' },
 *   ],
 *   async execute(args, ctx) {
 *     ctx.logger.info('Running my command...');
 *     // Do work here
 *   },
 * };
 * ```
 */
export interface CliCommandPlugin {
  /**
   * Command name (used in CLI invocation)
   * @example 'codegen' results in `adt codegen`
   */
  name: string;

  /**
   * Command description shown in help
   */
  description: string;

  /**
   * Command options (flags)
   */
  options?: CliOption[];

  /**
   * Positional arguments
   */
  arguments?: CliArgument[];

  /**
   * Nested subcommands
   * @example codegen.subcommands = [contractsCommand] results in `adt codegen contracts`
   */
  subcommands?: CliCommandPlugin[];

  /**
   * Execute the command
   *
   * @param args - Parsed arguments and options as key-value pairs
   * @param ctx - Execution context (cwd, config, logger)
   */
  execute?(args: Record<string, unknown>, ctx: CliContext): Promise<void>;
}

/**
 * Module that exports a CLI command plugin
 * Used for dynamic import resolution
 */
export interface CliCommandModule {
  /**
   * Default export should be the command plugin
   */
  default: CliCommandPlugin;
}

/**
 * ADT CLI configuration for command plugins
 */
export interface AdtCliConfig {
  /**
   * Command plugins to load
   * Can be package names or relative paths
   *
   * @example
   * ```typescript
   * commands: [
   *   '@abapify/adt-codegen/commands/codegen',
   *   './my-local-command',
   * ]
   * ```
   */
  commands?: string[];

  /**
   * Additional configuration passed to commands via context
   */
  [key: string]: unknown;
}
