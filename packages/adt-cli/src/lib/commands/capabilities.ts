import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import {
  assertRuntimeModules,
  collectCapabilityReport,
  type RegistryLike,
  type RuntimeCapabilityReport,
} from '../capabilities';
import { PluginRegistry } from '../plugins';
import { loadCliConfig } from '../plugin-loader';
import { getResolvedConfigPath } from '../config-argv';
import { cliVersion } from '../cli-version';

interface ConfiguredFormatPlugin {
  name: string;
  version?: string;
}

interface ConfigWithFormatPlugins {
  plugins?: { formats?: ConfiguredFormatPlugin[] };
}

/**
 * Resolve-configured module probe over the installed artifact. Bare package
 * specifiers resolve through the same import conditions the plugin loader
 * uses (`import.meta.resolve`); relative config paths resolve against the
 * working directory like `loadCommandPlugin` does. No registry or network
 * access.
 */
function resolveInstalledModule(name: string): boolean {
  if (isAbsolute(name)) {
    return existsSync(name);
  }
  if (name.startsWith('./') || name.startsWith('../')) {
    return existsSync(resolve(process.cwd(), name));
  }
  try {
    return Boolean(import.meta.resolve(name));
  } catch {
    return false;
  }
}

/**
 * Load one resolvable format plugin in isolation and read its declared
 * object types. A plugin that fails to load contributes no types — its
 * absence is already reported through the runtime-module probes.
 */
async function loadFormatObjectTypes(
  spec: ConfiguredFormatPlugin,
): Promise<string[]> {
  try {
    const registry = new PluginRegistry();
    await registry.loadFromConfig([spec]);
    const plugin = registry.getPlugin(spec.name);
    return plugin ? [...plugin.getSupportedObjectTypes()] : [];
  } catch {
    return [];
  }
}

/**
 * Build the runtime capability report for this installed artifact from its
 * loaded configuration: CLI identity, configured format plugins with their
 * declared object types, and configured command modules with
 * installed-artifact resolution facts. Deterministic and machine-readable.
 */
export async function collectInstalledCapabilities(): Promise<RuntimeCapabilityReport> {
  const configPath = getResolvedConfigPath(process.argv);
  const config = await loadCliConfig(process.cwd(), configPath);
  if (config === null && configPath !== undefined) {
    // An explicitly requested config that cannot be loaded is a failed
    // assessment, not an unconfigured installation.
    throw new Error(`Failed to load config from ${configPath}`);
  }
  const formatPlugins =
    (config as ConfigWithFormatPlugins | null)?.plugins?.formats ?? [];
  const formats = await Promise.all(
    formatPlugins.map(async (plugin) => ({
      format: plugin.name,
      objectTypes: await loadFormatObjectTypes(plugin),
    })),
  );
  formats.sort((a, b) => a.format.localeCompare(b.format));
  const configuredModules = [
    ...(config?.commands ?? []),
    ...formatPlugins.map((plugin) => plugin.name),
  ];
  return collectCapabilityReport({
    cli: { name: 'adt', version: cliVersion() },
    registry: {
      getAvailableFormats: () => formats.map((format) => format.format),
      getPlugin: (name: string) => {
        const format = formats.find((candidate) => candidate.format === name);
        return format
          ? { getSupportedObjectTypes: () => format.objectTypes }
          : undefined;
      },
    } satisfies RegistryLike,
    lazyModules: [...new Set(configuredModules)],
    resolveModule: resolveInstalledModule,
    features: {
      flow: (config?.commands ?? []).some((module) =>
        module.includes('@abapify/adt-flow'),
      ),
    },
  });
}

export const capabilitiesCommand = new Command('capabilities')
  .description(
    'Report installed runtime capabilities as versioned JSON (identity, formats, configured modules)',
  )
  .action(async () => {
    try {
      const report = await collectInstalledCapabilities();
      assertRuntimeModules(report);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`adt capabilities: ${message}\n`);
      process.exitCode = 1;
    }
  });
