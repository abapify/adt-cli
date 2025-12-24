import {
  FormatPlugin,
  PluginSpec,
  IPluginRegistry,
  ValidationResult,
} from './interfaces';
import {
  PluginNotFoundError,
  PluginLoadError,
  PluginConfigError,
} from './errors';

/**
 * Plugin registry implementation
 */
export class PluginRegistry implements IPluginRegistry {
  private plugins = new Map<string, FormatPlugin>();
  private pluginConfigs = new Map<string, any>();

  /**
   * Load plugins from configuration
   */
  async loadFromConfig(pluginSpecs: PluginSpec[]): Promise<void> {
    for (const spec of pluginSpecs) {
      try {
        const plugin = await this.loadPlugin(spec);
        this.register(plugin);

        if (spec.config) {
          this.pluginConfigs.set(plugin.name, spec.config);
        }
      } catch (error) {
        throw new PluginLoadError(
          spec.name,
          error instanceof Error ? error : undefined,
        );
      }
    }
  }

  /**
   * Get available format plugins
   */
  getAvailableFormats(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get specific plugin instance
   */
  getPlugin(formatName: string): FormatPlugin | undefined {
    return this.plugins.get(formatName);
  }

  /**
   * Validate all configured plugins
   */
  validatePlugins(): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const [name, plugin] of this.plugins) {
      const config = this.pluginConfigs.get(name);

      if (plugin.validateConfig && config) {
        const result = plugin.validateConfig(config);
        results.push({
          ...result,
          errors: result.errors.map((err) => `${name}: ${err}`),
        });
      } else {
        results.push({
          valid: true,
          errors: [],
        });
      }
    }

    return results;
  }

  /**
   * Register a plugin manually
   */
  register(plugin: FormatPlugin): void {
    const pluginName = plugin?.name ?? 'unknown';
    if (!this.isValidPlugin(plugin)) {
      throw new PluginConfigError(
        pluginName,
        'Plugin does not implement required interface',
      );
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Unregister a plugin
   */
  unregister(formatName: string): void {
    this.plugins.delete(formatName);
    this.pluginConfigs.delete(formatName);
  }

  /**
   * Load a plugin from specification
   */
  private async loadPlugin(spec: PluginSpec): Promise<FormatPlugin> {
    try {
      // Dynamic import of the plugin module
      const module = await import(spec.name);
      const plugin = module.default as FormatPlugin;

      if (!this.isValidPlugin(plugin)) {
        throw new PluginConfigError(
          spec.name,
          'Plugin does not implement FormatPlugin interface',
        );
      }

      return plugin;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Cannot resolve module')
      ) {
        throw new PluginNotFoundError(spec.name);
      }
      throw error;
    }
  }

  /**
   * Validate that an object implements the FormatPlugin interface
   */
  private isValidPlugin(plugin: any): plugin is FormatPlugin {
    return (
      plugin &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.description === 'string' &&
      typeof plugin.serializeObject === 'function' &&
      typeof plugin.getSupportedObjectTypes === 'function'
    );
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginName: string): any {
    return this.pluginConfigs.get(pluginName);
  }

  /**
   * Set plugin configuration
   */
  setPluginConfig(pluginName: string, config: any): void {
    this.pluginConfigs.set(pluginName, config);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.pluginConfigs.clear();
  }

  /**
   * Get plugin count
   */
  size(): number {
    return this.plugins.size;
  }
}
