import { shouldUseMockClient } from '../testing/cli-test-utils';
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
  oat: '@abapify/oat',
  abapgit: '@abapify/adt-plugin-abapgit',
};

/**
 * Parse format specification with optional preset
 * Examples:
 *   @abapify/oat -> { package: '@abapify/oat', preset: undefined }
 *   @abapify/oat/flat -> { package: '@abapify/oat', preset: 'flat' }
 *   oat -> { package: '@abapify/oat', preset: undefined } (shortcut)
 *   abapgit -> { package: '@abapify/adt-plugin-abapgit', preset: undefined } (shortcut)
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
    // @abapify/oat
    return { package: formatSpec };
  } else if (parts.length === 3) {
    // @abapify/oat/flat
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
    // Check if we're in test mode and should use mock plugin
    if (shouldUseMockClient() && packageName === '@abapify/oat') {
      const { MockOatPlugin } = await import('../testing/mock-oat-plugin');
      const options = preset
        ? { preset: preset as 'flat' | 'hierarchical' | 'grouped' }
        : {};
      const plugin = new MockOatPlugin(options);

      return {
        name: plugin.name,
        description: plugin.description,
        instance: plugin,
        preset,
      };
    }

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
      );
    }
    throw error;
  }
}
