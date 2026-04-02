/**
 * CLI Plugin Loader
 *
 * Dynamically loads CLI command plugins from config.
 * Translates CLI-agnostic plugin definitions to Commander commands.
 */

import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import type {
  CliCommandPlugin,
  CliContext,
  CliLogger,
  AdtCliConfig,
} from '@abapify/adt-plugin';
import { getAdtClientV2 } from './utils/adt-client-v2';
import { getAdtSystem } from './ui/components/link';

/**
 * Load config file from explicit path or current directory
 */
export async function loadCliConfig(
  cwd: string,
  explicitConfigPath?: string,
): Promise<AdtCliConfig | null> {
  // If explicit config path provided, use it directly
  if (explicitConfigPath) {
    const configPath = resolve(cwd, explicitConfigPath);
    if (existsSync(configPath)) {
      try {
        const module = await import(configPath);
        return module.default ?? module;
      } catch (err) {
        console.error(`Failed to load config from ${configPath}:`, err);
        return null;
      }
    } else {
      console.error(`Config file not found: ${configPath}`);
      return null;
    }
  }

  // Otherwise search for config in current directory and parents
  const configNames = ['adt.config.ts', 'adt.config.js', 'adt.config.mjs'];

  let dir = cwd;
  while (dir !== dirname(dir)) {
    for (const name of configNames) {
      const configPath = resolve(dir, name);
      if (existsSync(configPath)) {
        try {
          const module = await import(configPath);
          return module.default ?? module;
        } catch (err) {
          console.error(`Failed to load config from ${configPath}:`, err);
          return null;
        }
      }
    }
    dir = dirname(dir);
  }

  return null;
}

/**
 * Create a simple logger that wraps console
 */
function createSimpleLogger(): CliLogger {
  return {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.log(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args),
  };
}

/**
 * Convert a CLI-agnostic plugin to a Commander command
 */
function pluginToCommand(
  plugin: CliCommandPlugin,
  config: AdtCliConfig,
): Command {
  const cmd = new Command(plugin.name).description(plugin.description);

  // Add alias if specified
  if (plugin.alias) {
    cmd.alias(plugin.alias);
  }

  // Add options
  if (plugin.options) {
    for (const opt of plugin.options) {
      // Commander expects string | boolean | string[] for defaults
      const defaultValue =
        opt.default !== undefined
          ? typeof opt.default === 'number'
            ? String(opt.default)
            : (opt.default as string | boolean)
          : undefined;

      if (opt.required) {
        cmd.requiredOption(opt.flags, opt.description, defaultValue);
      } else {
        cmd.option(opt.flags, opt.description, defaultValue);
      }
    }
  }

  // Add arguments
  if (plugin.arguments) {
    for (const arg of plugin.arguments) {
      cmd.argument(arg.name, arg.description, arg.default);
    }
  }

  // Add subcommands recursively
  if (plugin.subcommands) {
    for (const sub of plugin.subcommands) {
      cmd.addCommand(pluginToCommand(sub, config));
    }
  }

  // Add action if execute is defined
  if (plugin.execute) {
    cmd.action(async (...actionArgs: unknown[]) => {
      // Commander passes options as last argument before Command
      const cmdInstance = actionArgs.pop() as Command;
      const options = cmdInstance.opts();

      // Merge positional args into options
      const args: Record<string, unknown> = { ...options };
      if (plugin.arguments) {
        plugin.arguments.forEach((argDef, index) => {
          const argName = argDef.name.replace(/[<>[\].]/g, '');
          args[argName] = actionArgs[index];
        });
      }

      const ctx: CliContext = {
        cwd: process.cwd(),
        config,
        logger: createSimpleLogger(),
        // Provide ADT client factory for plugins that need API access
        // Note: This is async - plugins must await the result
        getAdtClient: async () => await getAdtClientV2(),
        // Provide system name for ADT hyperlinks
        adtSystemName: getAdtSystem(),
      };

      try {
        await plugin.execute!(args, ctx);
      } catch (err) {
        console.error('Command failed:', err);
        process.exit(1);
      }
    });
  }

  return cmd;
}

/**
 * Load a command plugin from a module path
 */
async function loadCommandPlugin(
  modulePath: string,
  cwd: string,
): Promise<CliCommandPlugin | null> {
  try {
    // Handle relative paths
    const resolvedPath = modulePath.startsWith('.')
      ? resolve(cwd, modulePath)
      : modulePath;

    const module = await import(resolvedPath);
    const plugin = module.default ?? module;

    if (!plugin?.name || !plugin?.description) {
      console.warn(
        `Invalid command plugin: ${modulePath} (missing name or description)`,
      );
      return null;
    }

    return plugin as CliCommandPlugin;
  } catch (err) {
    console.warn(`Failed to load command plugin: ${modulePath}`, err);
    return null;
  }
}

/**
 * Load all command plugins from config and register with Commander
 */
export async function loadCommandPlugins(
  program: Command,
  cwd: string,
  explicitConfigPath?: string,
): Promise<void> {
  const config = await loadCliConfig(cwd, explicitConfigPath);

  if (!config?.commands?.length) {
    return;
  }

  for (const modulePath of config.commands) {
    const plugin = await loadCommandPlugin(modulePath, cwd);
    if (plugin) {
      const cmd = pluginToCommand(plugin, config);
      program.addCommand(cmd);
    }
  }
}

/**
 * Register pre-loaded (statically imported) plugins with Commander.
 *
 * Use this instead of {@link loadCommandPlugins} when building a standalone
 * binary with `bun build --compile`. Because Bun's bundler resolves imports
 * at compile time, dynamic `import(path)` calls with runtime-computed paths
 * (as used in `loadCommandPlugins`) cannot be embedded in the binary. By
 * passing statically-imported plugin objects here, every module is visible to
 * the bundler and gets embedded into the executable.
 *
 * Unlike `loadCommandPlugins`, this function does **not** read the `commands`
 * array from `adt.config.ts`; plugins are provided directly by the caller.
 * The config file is still loaded (if present) so its other settings are
 * available to plugins via `ctx.config`.
 */
export async function loadStaticPlugins(
  program: Command,
  plugins: CliCommandPlugin[],
  cwd: string,
  explicitConfigPath?: string,
): Promise<void> {
  // Load config for context data (e.g. system settings); fall back to empty
  const config = (await loadCliConfig(cwd, explicitConfigPath)) ?? {
    commands: [],
  };

  for (const plugin of plugins) {
    program.addCommand(pluginToCommand(plugin, config));
  }
}
