#!/usr/bin/env -S npx tsx

// Bootstrap: side-effect import registers the abapGit FormatPlugin into the
// global registry (`@abapify/adt-plugin`). This is the ONE sanctioned place
// where adt-cli depends on `@abapify/adt-plugin-abapgit` directly — every
// other consumer MUST go through `getFormatPlugin('abapgit')`.
import '@abapify/adt-plugin-abapgit';
// Second built-in FormatPlugin — gCTS / AFF. Same self-registration pattern:
// side-effect import is the one sanctioned coupling between adt-cli and the
// plugin package; every other consumer uses `getFormatPlugin('gcts')`.
import '@abapify/adt-plugin-gcts';

import { Command } from 'commander';
import { cliVersion } from './cli-version';
import { getResolvedConfigPath } from './config-argv';

export { getResolvedConfigPath };
import {
  importObjectCommand,
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
  unlockCommand,
  lockCommand,
  locksCommand,
  checkCommand,
  userCommand,
  sourceCommand,
  lintCommand,
  contextCommand,
  createDiagnoseCommand,
  strustCommand,
  checkinCommand,
  createChangesetCommand,
  rfcCommand,
  createFlpCommand,
  proxyCommand,
} from './commands';
import { createWbCommand } from './commands/wb';
import { createPackageCommand } from './commands/package';
import {
  classCommand,
  programCommand,
  interfaceCommand,
  includeCommand,
} from './commands/object';
import { functionCommand } from './commands/function';
import {
  domainCommand,
  dataelementCommand,
  tableCommand,
  structureCommand,
} from './commands/ddic';
import { createDatapreviewCommand } from './commands/datapreview';
import { capabilitiesCommand } from './commands/capabilities';
import { createAbapCommand } from './commands/abap';
import { ddlCommand, dclCommand } from './commands/cds';
import { bdefCommand } from './commands/bdef';
import { badiCommand, getBadiCommand } from './commands/badi';
import { srvdCommand } from './commands/srvd';
import { srvbCommand } from './commands/srvb';
import { createCheckoutCommand } from './commands/checkout';
import { refreshCommand } from './commands/auth/refresh';
// Deploy command moved to @abapify/adt-export plugin
// Add '@abapify/adt-export/commands/export' to adt.config.ts commands array to enable
import { createCliLogger, AVAILABLE_COMPONENTS } from './utils/logger-config';
import { setCliContext } from './utils/adt-client-v2';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { loadCommandPlugins, loadStaticPlugins } from './plugin-loader';
import type { CliCommandPlugin } from '@abapify/adt-plugin';
// gCTS CLI command plugin (E07) — auto-discovered: shipped as a required
// dep of adt-cli and registered here so `adt gcts …` is always available.
import { gctsCommand } from '@abapify/adt-plugin-gcts-cli';

// Check for insecure SSL flag in stored session and apply it globally
function applyInsecureSslFlag(): void {
  try {
    const authFile = resolve(homedir(), '.adt', 'auth.json');

    if (existsSync(authFile)) {
      const session = JSON.parse(readFileSync(authFile, 'utf8'));
      if (session.insecure) {
        // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Commented out for testing proper cert validation
      }
    }
  } catch (_error) {
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

function registerAuthAndCoreCommands(program: Command): void {
  const authCmd = program
    .command('auth')
    .description('Authentication commands');
  authCmd.addCommand(loginCommand);
  authCmd.addCommand(logoutCommand);
  authCmd.addCommand(statusCommand);
  authCmd.addCommand(authListCommand);
  authCmd.addCommand(setDefaultCommand);
  authCmd.addCommand(refreshCommand);

  program.addCommand(discoveryCommand);
  program.addCommand(infoCommand);
  program.addCommand(capabilitiesCommand);
  program.addCommand(fetchCommand);
  program.addCommand(getCommand);
  getCommand.addCommand(packageGetCommand);
  getCommand.addCommand(getBadiCommand);
  program.addCommand(searchCommand);
  program.addCommand(lsCommand);
  program.addCommand(createCtsCommand());
}

function registerImportAndUtilityCommands(program: Command): void {
  const importCmd = program
    .command('import')
    .description('Import ABAP objects to various formats (abapGit, etc.)');
  importCmd.addCommand(importObjectCommand);
  importCmd.addCommand(importPackageCommand);
  importCmd.addCommand(importTransportCommand);

  program.addCommand(lockCommand);
  program.addCommand(unlockCommand);
  program.addCommand(locksCommand);
  program.addCommand(checkCommand);
  program.addCommand(sourceCommand);
  program.addCommand(lintCommand);
  program.addCommand(contextCommand);
  program.addCommand(createDiagnoseCommand());
  program.addCommand(userCommand);
  program.addCommand(strustCommand);
}

function registerObjectAndRapCommands(program: Command): void {
  program.addCommand(createPackageCommand());
  program.addCommand(classCommand);
  program.addCommand(programCommand);
  program.addCommand(interfaceCommand);
  program.addCommand(includeCommand);
  program.addCommand(functionCommand);
  program.addCommand(domainCommand);
  program.addCommand(dataelementCommand);
  program.addCommand(tableCommand);
  program.addCommand(structureCommand);
  program.addCommand(createDatapreviewCommand());
  program.addCommand(createAbapCommand());
  program.addCommand(ddlCommand);
  program.addCommand(dclCommand);
  program.addCommand(bdefCommand);
  program.addCommand(badiCommand);
  program.addCommand(srvdCommand);
  program.addCommand(srvbCommand);
  program.addCommand(createCheckoutCommand());
  program.addCommand(checkinCommand);
  program.addCommand(createChangesetCommand());
  program.addCommand(rfcCommand);
  program.addCommand(createFlpCommand());
  program.addCommand(createWbCommand());
  program.addCommand(createReplCommand());
  program.addCommand(proxyCommand);
}

async function registerPluginCommands(
  program: Command,
  options?: { preloadedPlugins?: CliCommandPlugin[] },
): Promise<void> {
  // Parse --config before any static plugin loads its configuration.
  const configPath = getResolvedConfigPath(process.argv);

  // gCTS command-plugin (E07). Auto-registered here (not via adt.config.ts)
  // because `@abapify/adt-plugin-gcts-cli` is a required dependency of
  // `adt-cli`, matching the pattern used for the abapGit/gCTS *format*
  // plugins above.
  await loadStaticPlugins(program, [gctsCommand], process.cwd(), configPath);

  // Load command plugins from config (adt.config.ts or --config)
  if (options?.preloadedPlugins !== undefined) {
    // Bundled mode: register statically imported plugins (no dynamic import needed)
    await loadStaticPlugins(
      program,
      options.preloadedPlugins,
      process.cwd(),
      configPath,
    );
  } else if (process.argv[2] === 'capabilities') {
    // Capability assessment must not import configured command plugins:
    // their top-level code could produce side effects or contaminate the
    // machine-readable report. Format plugins are loaded by the command
    // itself, in isolation.
  } else {
    await loadCommandPlugins(program, process.cwd(), configPath);
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
    .version(cliVersion())
    .option(
      '--sid <sid>',
      'SAP System ID (e.g., TRL) - overrides default system',
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
    .option(
      '--config <path>',
      'Path to config file (default: adt.config.ts, or .adt/config.ts if present)',
    )
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.optsWithGlobals();
      const logger = createCliLogger({ verbose: opts.verbose });
      (thisCommand as any).logger = logger;
      (thisCommand as any).loggingConfig = {
        logLevel: opts.logLevel || 'info',
        logOutput: opts.logOutput || './tmp/logs',
        logResponseFiles: opts.logResponseFiles || false,
      };
    });

  registerAuthAndCoreCommands(program);
  registerImportAndUtilityCommands(program);
  registerObjectAndRapCommands(program);
  await registerPluginCommands(program, options);

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
  program.hook('preAction', (thisCommand, actionCommand) => {
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
      configPath: globalOptions.config as string | undefined,
    });
  });

  await program.parseAsync(process.argv);
}
