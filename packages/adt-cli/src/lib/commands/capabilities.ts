import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { collectCapabilityReport } from '../capabilities';
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
 * Resolve-configured module probe over the installed artifact. Package
 * specifiers resolve through the installed node layout; relative config
 * paths resolve against the working directory. No registry or network
 * access, no plugin code execution.
 */
function resolveInstalledModule(name: string): boolean {
  if (isAbsolute(name)) {
    return existsSync(name);
  }
  try {
    createRequire(import.meta.url).resolve(name);
    return true;
  } catch {
    return existsSync(resolve(process.cwd(), name));
  }
}

/**
 * Build the runtime capability report for this installed artifact from its
 * loaded configuration: CLI identity, configured formats and command
 * modules with installed-artifact resolution facts. Machine-readable and
 * deterministic; no packaging-layout introspection.
 */
export async function collectInstalledCapabilities() {
  const config = await loadCliConfig(
    process.cwd(),
    getResolvedConfigPath(process.argv),
  );
  const formatPlugins =
    (config as ConfigWithFormatPlugins | null)?.plugins?.formats ?? [];
  const configuredFormats = formatPlugins
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((plugin) => ({
      format: plugin.name,
      objectTypes: [] as string[],
    }));
  const configuredModules = [
    ...(config?.commands ?? []),
    ...formatPlugins.map((plugin) => plugin.name),
  ];
  return collectCapabilityReport({
    cli: { name: 'adt', version: cliVersion() },
    registry: {
      getAvailableFormats: () => configuredFormats.map((f) => f.format),
      getPlugin: () => undefined,
    },
    lazyModules: [...new Set(configuredModules)],
    resolveModule: resolveInstalledModule,
    features: {
      commandPlugins: (config?.commands?.length ?? 0) > 0,
      formatPlugins: configuredFormats.length > 0,
    },
  });
}

export const capabilitiesCommand = new Command('capabilities')
  .description(
    'Report installed runtime capabilities as versioned JSON (identity, formats, configured modules)',
  )
  .action(async () => {
    const report = await collectInstalledCapabilities();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  });
