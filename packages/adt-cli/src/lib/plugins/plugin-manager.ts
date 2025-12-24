// NOTE: BaseFormat and FormatRegistry were removed during v2 migration
// The format plugin system needs to be redesigned with ADK integration
// import { BaseFormat } from '../formats/base-format';
import { ConfigLoader } from '../config/loader';
import { CliConfig } from '../config/interfaces';

// NOTE: Stub interface until format plugin system is redesigned with ADK
interface BaseFormat {
  name: string;
  description: string;
}

export interface PluginInfo {
  name: string;
  shortName: string;
  instance: BaseFormat;
  description: string;
}

export interface PluginSpec {
  name: string;
  config?: {
    enabled?: boolean;
    options?: Record<string, any>;
  };
}

export class PluginManager {
  private static instance: PluginManager;
  private loadedPlugins = new Map<string, PluginInfo>();
  private configLoader = new ConfigLoader();

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Load plugins from configuration
   */
  async loadPluginsFromConfig(config?: CliConfig): Promise<void> {
    const resolvedConfig = config || (await this.configLoader.load());

    if (!resolvedConfig.plugins?.formats) {
      return;
    }

    for (const pluginSpec of resolvedConfig.plugins.formats) {
      if (pluginSpec.config?.enabled !== false) {
        await this.loadPlugin(pluginSpec.name, pluginSpec.config?.options);
      }
    }
  }

  /**
   * Load a specific plugin by name (supports @package/plugin syntax)
   */
  async loadPlugin(
    pluginName: string,
    options?: Record<string, any>,
  ): Promise<PluginInfo> {
    const shortName = this.getShortName(pluginName);

    // Check if already loaded
    if (this.loadedPlugins.has(shortName)) {
      return this.loadedPlugins.get(shortName)!;
    }

    try {
      let formatInstance: BaseFormat;

      if (pluginName.startsWith('@')) {
        // Dynamic loading from npm package
        formatInstance = await this.loadExternalPlugin(pluginName, options);
      } else {
        // Built-in plugin
        formatInstance = await this.loadBuiltinPlugin(pluginName, options);
      }

      const pluginInfo: PluginInfo = {
        name: pluginName,
        shortName,
        instance: formatInstance,
        description: formatInstance.description,
      };

      this.loadedPlugins.set(shortName, pluginInfo);
      return pluginInfo;
    } catch (error) {
      throw new Error(
        `Failed to load plugin '${pluginName}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Get available format names (short names)
   */
  getAvailableFormats(): string[] {
    return Array.from(this.loadedPlugins.keys());
  }

  /**
   * Get plugin by short name
   */
  getPlugin(shortName: string): PluginInfo | undefined {
    return this.loadedPlugins.get(shortName);
  }

  /**
   * Get format instance by short name
   */
  getFormat(shortName: string): BaseFormat {
    const plugin = this.loadedPlugins.get(shortName);
    if (!plugin) {
      throw new Error(
        `Format '${shortName}' not loaded. Available: ${this.getAvailableFormats().join(
          ', ',
        )}`,
      );
    }
    return plugin.instance;
  }

  /**
   * List all loaded plugins with descriptions
   */
  listPlugins(): Array<{
    name: string;
    shortName: string;
    description: string;
  }> {
    return Array.from(this.loadedPlugins.values()).map((plugin) => ({
      name: plugin.name,
      shortName: plugin.shortName,
      description: plugin.description,
    }));
  }

  /**
   * Determine default format based on loaded plugins
   */
  async getDefaultFormat(config?: CliConfig): Promise<string | undefined> {
    const resolvedConfig = config || (await this.configLoader.load());

    // Check if explicit default is configured
    if (resolvedConfig.defaults?.format) {
      const shortName = this.getShortName(resolvedConfig.defaults.format);
      if (this.loadedPlugins.has(shortName)) {
        return shortName;
      }
    }

    // If only one plugin loaded, use it as default
    const availableFormats = this.getAvailableFormats();
    if (availableFormats.length === 1) {
      return availableFormats[0];
    }

    return undefined;
  }

  /**
   * Check if format selection is required (more than one plugin available)
   */
  isFormatSelectionRequired(): boolean {
    return this.getAvailableFormats().length > 1;
  }

  /**
   * Convert full plugin name to short name
   */
  getShortName(pluginName: string): string {
    if (pluginName.startsWith('@abapify/')) {
      return pluginName.replace('@abapify/', '');
    }
    if (pluginName.startsWith('@')) {
      // For external packages like @company/plugin, use the plugin part
      const parts = pluginName.split('/');
      return parts[parts.length - 1];
    }
    return pluginName;
  }

  /**
   * Load external plugin from npm package
   */
  private async loadExternalPlugin(
    packageName: string,
    options?: Record<string, any>,
  ): Promise<BaseFormat> {
    try {
      // Dynamic import of external package
      const pluginModule = await import(packageName);

      // Look for common export patterns
      const FormatClass =
        pluginModule.default ||
        pluginModule.Format ||
        pluginModule[
          Object.keys(pluginModule).find((key) => key.endsWith('Format')) || ''
        ];

      if (!FormatClass) {
        throw new Error(
          `No format class found in package '${packageName}'. Expected exports: default, Format, or *Format`,
        );
      }

      return new FormatClass(options);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Cannot resolve module')
      ) {
        throw new Error(
          `Package '${packageName}' not found. Install it with: npm install ${packageName}`,
        );
      }
      throw error;
    }
  }

  /**
   * Load built-in plugin
   * NOTE: FormatRegistry was removed - needs ADK migration
   */
  private async loadBuiltinPlugin(
    pluginName: string,
    _options?: Record<string, any>,
  ): Promise<BaseFormat> {
    throw new Error(
      `Built-in plugin '${pluginName}' not available - FormatRegistry needs ADK migration`,
    );
  }

  /**
   * Clear all loaded plugins (for testing)
   */
  clear(): void {
    this.loadedPlugins.clear();
  }
}
