// Static import for bundled abapgit plugin
import * as abapgitPlugin from '@abapify/adt-plugin-abapgit';

/**
 * Bundled format plugins - statically imported for bundler compatibility
 */
const BUNDLED_PLUGINS: Record<string, any> = {
  '@abapify/adt-plugin-abapgit': abapgitPlugin,
};

/**
 * Format shortcuts - map short names to actual package names
 */
const FORMAT_SHORTCUTS: Record<string, string> = {
  abapgit: '@abapify/adt-plugin-abapgit',
  ag: '@abapify/adt-plugin-abapgit',
};

/**
 * Parse format specification with optional preset
 * Examples:
 *   @abapify/adt-plugin-abapgit -> { package: '@abapify/adt-plugin-abapgit', preset: undefined }
 *   @abapify/adt-plugin-abapgit/full -> { package: '@abapify/adt-plugin-abapgit', preset: 'full' }
 *   abapgit -> { package: '@abapify/adt-plugin-abapgit', preset: undefined } (shortcut)
 *   ag -> { package: '@abapify/adt-plugin-abapgit', preset: undefined } (shortcut)
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
 * Load format plugin
 * Uses static imports for bundled plugins, dynamic imports for external ones
 */
export async function loadFormatPlugin(formatSpec: string) {
  const { package: packageName, preset } = parseFormatSpec(formatSpec);

  try {
    // Use bundled plugin if available, otherwise try dynamic import
    const pluginModule =
      BUNDLED_PLUGINS[packageName] ?? (await import(packageName));
    const PluginClass =
      pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];

    if (!PluginClass) {
      throw new Error(`No plugin class found in ${packageName}`);
    }

    // Create plugin instance with preset options
    const options = preset ? { preset } : {};

    // Check if PluginClass is already an instance (from createFormatPlugin)
    // or if it's a constructor function that needs to be instantiated
    const plugin =
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
    // Check both error code (CommonJS) and message (ES modules)
    if (
      (err as any).code === 'MODULE_NOT_FOUND' ||
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
