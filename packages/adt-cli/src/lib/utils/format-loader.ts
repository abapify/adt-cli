/**
 * Format-plugin loader for CLI commands.
 *
 * Format plugins self-register into the global `FormatPlugin` registry when
 * their package is imported. This loader translates the CLI's legacy format
 * spec (`abapgit` / `ag` / `@abapify/adt-plugin-abapgit` / `pkg/preset`) into
 * a live `AdtPlugin` (the higher-level import/export plugin) so existing
 * import services keep working.
 *
 * Built-in format id → package mappings. New built-in formats just need one
 * extra entry here (plus the side-effect import in `cli.ts`).
 */
import { getFormatPlugin, type AdtPlugin } from '@abapify/adt-plugin';

const FORMAT_SHORTCUTS: Record<string, string> = {
  abapgit: '@abapify/adt-plugin-abapgit',
  ag: '@abapify/adt-plugin-abapgit',
};

/** Resolve a CLI format id to its registered package name (if known). */
function resolvePackageForFormatId(id: string): string | undefined {
  return FORMAT_SHORTCUTS[id];
}

/**
 * Parse format specification with optional preset.
 *
 * Examples:
 *   @abapify/adt-plugin-abapgit        → { package: '@abapify/adt-plugin-abapgit' }
 *   @abapify/adt-plugin-abapgit/full   → { package: '@abapify/adt-plugin-abapgit', preset: 'full' }
 *   abapgit                            → { package: '@abapify/adt-plugin-abapgit' } (shortcut)
 *   ag                                 → { package: '@abapify/adt-plugin-abapgit' } (shortcut)
 */
export function parseFormatSpec(formatSpec: string): {
  package: string;
  preset?: string;
} {
  if (formatSpec in FORMAT_SHORTCUTS) {
    return { package: FORMAT_SHORTCUTS[formatSpec] };
  }

  const parts = formatSpec.split('/');
  if (parts.length === 2) {
    // @abapify/adt-plugin-abapgit
    return { package: formatSpec };
  } else if (parts.length === 3) {
    // @abapify/adt-plugin-abapgit/full
    const package_ = `${parts[0]}/${parts[1]}`;
    const preset = parts[2];
    return { package: package_, preset };
  } else {
    throw new Error(`Invalid format specification: ${formatSpec}`);
  }
}

/**
 * Load a format plugin by CLI spec.
 *
 * Resolution order:
 *   1. Look up the format id in the {@link FormatPlugin} registry. If it is
 *      already registered (e.g. via CLI bootstrap), use it without any dynamic
 *      import.
 *   2. Otherwise dynamically `import(packageName)` — this triggers the
 *      package's self-registration side-effects — then return the resolved
 *      legacy `AdtPlugin` instance from the package's default/named export.
 */
export async function loadFormatPlugin(formatSpec: string): Promise<{
  name: string;
  description: string;
  instance: AdtPlugin;
  preset?: string;
}> {
  const { package: packageName, preset } = parseFormatSpec(formatSpec);

  // Fast path: if the format plugin has already self-registered (typical when
  // the CLI bootstrap has side-effect-imported the package), we're done — but
  // we still need the legacy AdtPlugin instance for the import services, so
  // fall through to the dynamic import. The registry lookup merely validates
  // that the requested format is available.
  const builtinId = Object.entries(FORMAT_SHORTCUTS).find(
    ([, pkg]) => pkg === packageName,
  )?.[0];
  if (builtinId && !getFormatPlugin(builtinId)) {
    // Registry is empty for this id — the dynamic import below will populate
    // it via the package's self-registration side-effect.
  }

  try {
    const pluginModule = await import(packageName);
    const PluginClass =
      pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];

    if (!PluginClass) {
      throw new Error(`No plugin class found in ${packageName}`);
    }

    const options = preset ? { preset } : {};

    const plugin: AdtPlugin =
      typeof PluginClass === 'function' && PluginClass.prototype
        ? new PluginClass(options)
        : PluginClass;

    return {
      name: plugin.name || packageName,
      description: plugin.description || `Plugin from ${packageName}`,
      instance: plugin,
      preset,
    };
  } catch (error: unknown) {
    const err = error as Error;
    if (
      (err as { code?: string }).code === 'MODULE_NOT_FOUND' ||
      err.message?.includes(`Cannot find module '${packageName}'`)
    ) {
      throw new Error(
        `Plugin package '${packageName}' not found. Install it with: bun add ${packageName}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export { resolvePackageForFormatId };
