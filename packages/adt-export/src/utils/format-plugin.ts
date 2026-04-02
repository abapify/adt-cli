/**
 * Shared format plugin loader for export commands.
 *
 * Extracted from export.ts / activate.ts / roundtrip.ts to avoid
 * cross-file duplication (SonarQube CPD).
 */

import type { AdtPlugin } from '@abapify/adt-plugin';

/** Map short names to actual package names */
const FORMAT_SHORTCUTS: Record<string, string> = {
  abapgit: '@abapify/adt-plugin-abapgit',
  ag: '@abapify/adt-plugin-abapgit', // alias
};

/**
 * Load format plugin dynamically by short name or package name.
 */
export async function loadFormatPlugin(formatSpec: string): Promise<AdtPlugin> {
  const packageName = FORMAT_SHORTCUTS[formatSpec] ?? formatSpec;

  try {
    const pluginModule = await import(packageName);
    const PluginClass =
      pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];

    if (!PluginClass) {
      throw new Error(`No plugin class found in ${packageName}`);
    }

    // Check if it's already an instance or needs instantiation
    return typeof PluginClass === 'function' && PluginClass.prototype
      ? new PluginClass()
      : PluginClass;
  } catch (error: unknown) {
    const err = error as Error;
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
