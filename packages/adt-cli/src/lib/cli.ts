#!/usr/bin/env -S npx tsx

import { Command } from 'commander';
import {
  importPackageCommand,
  importTransportCommand,
  searchCommand,
  discoveryCommand,
  infoCommand,
  fetchCommand,
  getCommand,
  // ATC command moved to @abapify/adt-atc plugin
  loginCommand,
  logoutCommand,
  statusCommand,
  authListCommand,
  setDefaultCommand,
  createCtsCommand,
  createReplCommand,
  packageGetCommand,
  lsCommand,
} from './commands';
import { refreshCommand } from './commands/auth/refresh';
// Deploy command moved to @abapify/adt-export plugin
// Add '@abapify/adt-export/commands/export' to adt.config.ts commands array to enable
import { createCliLogger, AVAILABLE_COMPONENTS } from './utils/logger-config';
import { setCliContext, getCliContext } from './utils/adt-client-v2';
import { getAuthManager, setDefaultSid } from './utils/auth';
import { readServiceKey } from '@abapify/adt-auth';
import { loadCommandPlugins, loadStaticPlugins } from './plugin-loader';
import type { CliCommandPlugin } from '@abapify/adt-plugin';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Check for insecure SSL flag in stored session and apply it globally
function applyInsecureSslFlag(): void {
  try {
    const authFile = resolve(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.adt',
      'auth.json',
    );

    if (existsSync(authFile)) {
      const session = JSON.parse(readFileSync(authFile, 'utf8'));
      if (session.insecure) {
        // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Commented out for testing proper cert validation
      }
    }
  } catch (error) {
    // Silently ignore errors - session might not exist yet
  }
}

// Add global options help to all commands using afterAll hook
function addGlobalOptionsHelpToAll(rootProgram: Command): void {
  // Get global options from root program
  const globalOptions = rootProgram.options
    .filter(
      (option) =>
        !option.flags.includes('-h, --help') &&
        !option.flags.includes('-V, --version'),
    )
    .map((option) => `  ${option.flags.padEnd(30)} ${option.description}`)
    .join('\n');

  if (globalOptions) {
    rootProgram.addHelpText('afterAll', (context) => {
      // Skip the main program to avoid duplicate global options
      if (context.command === rootProgram) {
        return '';
      }

      return `
Global Options:
${globalOptions}
`;
    });
  }
}

// Create main program
export async function createCLI(options?: {
  /** Pre-loaded plugins to register instead of loading from config.
   *  Pass this when building a bundled/standalone binary so that Bun
   *  can statically analyse the imports. */
  preloadedPlugins?: CliCommandPlugin[];
}): Promise<Command> {
  const program = new Command();

  program
    .name('adt')
    .description('ADT CLI tool for managing SAP ADT services')
    .version('1.0.0')
    .option(
      '--sid <sid>',
      'SAP System ID (e.g., BHF, S0D) - overrides default system',
    )
    .option(
      '-v, --verbose [components]',
      `Enable verbose logging. Optionally filter by components: ${AVAILABLE_COMPONENTS.join(
        ', ',
      )} or 'all'`,
    )
    .option(
      '--log-level <level>',
      'Log level: trace|debug|info|warn|error',
      'info',
    )
    .option(
      '--log-output <dir>',
      'Output directory for log files',
      './tmp/logs',
    )
    .option(
      '--log-response-files',
      'Save ADT responses as separate files',
      false,
    )
    .option('--config <path>', 'Path to config file (default: adt.config.ts)')
    .option(
      '--service-key <path>',
      'Path to a BTP service key JSON file. Auto-authenticates before running the command.',
    )
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.optsWithGlobals();

      // Create logger based on global options
      const logger = createCliLogger({
        verbose: opts.verbose,
      });

      // Store logger and logging config for use in commands
      (thisCommand as any).logger = logger;
      (thisCommand as any).loggingConfig = {
        logLevel: opts.logLevel || 'info',
        logOutput: opts.logOutput || './tmp/logs',
        logResponseFiles: opts.logResponseFiles || false,
      };
    });

  // Auth commands
  const authCmd = program
    .command('auth')
    .description('Authentication commands');

  authCmd.addCommand(loginCommand);
  authCmd.addCommand(logoutCommand);
  authCmd.addCommand(statusCommand);
  authCmd.addCommand(authListCommand);
  authCmd.addCommand(setDefaultCommand);
  authCmd.addCommand(refreshCommand);

  // Discovery command
  program.addCommand(discoveryCommand);

  // Info command (system and session info)
  program.addCommand(infoCommand);

  // Fetch command (authenticated HTTP requests)
  program.addCommand(fetchCommand);

  // Object inspector command
  program.addCommand(getCommand);

  // Get subcommands for specific object types
  getCommand.addCommand(packageGetCommand);

  // ATC (ABAP Test Cockpit) command - now loaded as plugin from @abapify/adt-atc
  // Add '@abapify/adt-atc/commands/atc' to adt.config.ts commands array to enable

  // Search command
  program.addCommand(searchCommand);

  // List objects in repository (format-aware: abapgit, AFF)
  program.addCommand(lsCommand);

  // CTS commands (v2 client) - replaces old 'transport' command
  // Use: adt cts search, adt cts get <TR>
  // NOTE: Future commands - adt cts create, adt cts release (via ADK), adt cts check
  program.addCommand(createCtsCommand());

  // Import commands
  const importCmd = program
    .command('import')
    .description('Import ABAP objects to various formats (OAT, abapGit, etc.)');

  importCmd.addCommand(importPackageCommand);
  importCmd.addCommand(importTransportCommand);

  // Export commands - moved to @abapify/adt-export plugin
  // Add '@abapify/adt-export/commands/export' to adt.config.ts commands array to enable

  // Deploy command moved to @abapify/adt-export plugin
  // Add '@abapify/adt-export/commands/export' to adt.config.ts commands array to enable

  // REPL - Interactive hypermedia navigator
  program.addCommand(createReplCommand());

  // Load command plugins from config (adt.config.ts or --config)
  // NOTE: We need to parse --config early since plugins must be loaded before parseAsync()
  const configArgIndex = process.argv.findIndex((arg) => arg === '--config');
  const configPath =
    configArgIndex !== -1 ? process.argv[configArgIndex + 1] : undefined;

  if (options?.preloadedPlugins !== undefined) {
    // Bundled mode: register statically imported plugins (no dynamic import needed)
    await loadStaticPlugins(
      program,
      options.preloadedPlugins,
      process.cwd(),
      configPath,
    );
  } else {
    await loadCommandPlugins(program, process.cwd(), configPath);
  }

  // Apply global options help to all commands using afterAll hook
  addGlobalOptionsHelpToAll(program);

  return program;
}

// Main execution function
export async function main(options?: {
  preloadedPlugins?: CliCommandPlugin[];
}): Promise<void> {
  // Apply insecure SSL flag from session if present
  applyInsecureSslFlag();

  const program = await createCLI(options);

  // Add a hook to set up logger before command execution
  program.hook('preAction', async (thisCommand, actionCommand) => {
    // Set CLI mode for ADT client logger to enable pretty formatting
    process.env.ADT_CLI_MODE = 'true';

    // Get global options from root program
    let rootCmd = actionCommand;
    while (rootCmd.parent) {
      rootCmd = rootCmd.parent;
    }
    const globalOptions = rootCmd.opts();

    // Create and set global logger for ADT client
    const logger = createCliLogger({ verbose: globalOptions.verbose });
    const loggingConfig = {
      logLevel: globalOptions.logLevel || 'info',
      logOutput: globalOptions.logOutput || './tmp/logs',
      logResponseFiles: Boolean(globalOptions.logResponseFiles),
    };

    // Set CLI context for getAdtClientV2 (auto-reads these options)
    setCliContext({
      sid: globalOptions.sid,
      logger,
      logLevel: loggingConfig.logLevel,
      logOutput: loggingConfig.logOutput,
      logResponseFiles: loggingConfig.logResponseFiles,
      verbose: globalOptions.verbose,
      configPath: globalOptions.config,
    });

    // Handle --service-key: auto-authenticate before running the command
    if (globalOptions.serviceKey) {
      try {
        const serviceKey = readServiceKey(globalOptions.serviceKey as string);

        if (!serviceKey.systemid && !globalOptions.sid) {
          throw new Error(
            'Service key does not contain a systemid. Use --sid to specify the system ID.',
          );
        }

        const sid =
          globalOptions.sid?.toUpperCase() || serviceKey.systemid.toUpperCase();

        const authManager = getAuthManager();
        await authManager.login(sid, {
          type: '@abapify/adt-auth/plugins/service-key',
          options: {
            url: serviceKey.url,
            serviceKey,
          },
        });

        // Explicitly set the SID so downstream commands find the session
        setDefaultSid(sid);
        setCliContext({ ...getCliContext(), sid });
      } catch (error) {
        console.error(
          '❌ Service key authentication failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }
  });

  await program.parseAsync(process.argv);
}
