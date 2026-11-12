import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import {
  collectCapabilityReport,
  type RegistryLike,
  type RuntimeCapabilityReport,
} from './capabilities';
import { PluginRegistry } from './plugins';
import { loadCliConfig } from './plugin-loader';
import { getResolvedConfigPath } from './config-argv';
import { cliVersion } from './cli-version';

interface ConfiguredFormatPlugin {
  name: string;
  version?: string;
}

interface ConfigWithFormatPlugins {
  plugins?: { formats?: ConfiguredFormatPlugin[] };
}

/**
 * Built-in commands load these runtime modules lazily (login browser
 * opening, interactive prompts). They ship as production dependencies, so
 * an installed artifact that cannot resolve them is broken.
 */
const BUILTIN_LAZY_MODULES: readonly string[] = ['open', '@inquirer/prompts'];

/**
 * Resolve-configured module probe over the installed artifact. Bare package
 * specifiers resolve through the same import conditions the plugin loader
 * uses (`import.meta.resolve`); relative config paths resolve against the
 * working directory like `loadCommandPlugin` does. A path counts as
 * resolved only when it can host an ESM entry (a file, or a directory with
 * a package manifest or index entry). No registry or network access.
 */
function resolveInstalledModule(name: string): boolean {
  if (isAbsolute(name)) {
    return pathHostesModule(name);
  }
  if (name.startsWith('./') || name.startsWith('../')) {
    return pathHostesModule(resolve(process.cwd(), name));
  }
  try {
    return Boolean(import.meta.resolve(name));
  } catch {
    return false;
  }
}

function pathHostesModule(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }
  if (statSync(path).isFile()) {
    return true;
  }
  return (
    existsSync(resolve(path, 'package.json')) ||
    existsSync(resolve(path, 'index.mjs')) ||
    existsSync(resolve(path, 'index.js'))
  );
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

async function loadConfiguredFormats(
  formatPlugins: readonly ConfiguredFormatPlugin[],
): Promise<Array<{ format: string; objectTypes: string[] }>> {
  const formats = await Promise.all(
    formatPlugins.map(async (plugin) => ({
      format: plugin.name,
      objectTypes: await loadFormatObjectTypes(plugin),
    })),
  );
  formats.sort((a, b) => a.format.localeCompare(b.format));
  return formats;
}

function configuredModuleList(
  config: { commands?: string[] } | null,
  formatPlugins: readonly ConfiguredFormatPlugin[],
): string[] {
  return [
    ...BUILTIN_LAZY_MODULES,
    ...(config?.commands ?? []),
    ...formatPlugins.map((plugin) => plugin.name),
  ];
}

/**
 * The diagnostic feature the contract promises: flow support is available
 * when the configured command set includes the flow command module.
 */
function diagnosticFeatures(config: { commands?: string[] } | null) {
  return {
    flow: (config?.commands ?? []).some((module) =>
      module.includes('@abapify/adt-flow'),
    ),
  };
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
  const formats = await loadConfiguredFormats(formatPlugins);
  const configuredModules = configuredModuleList(config, formatPlugins);
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
    features: diagnosticFeatures(config),
  });
}
