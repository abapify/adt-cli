import { CliConfig, ConfigValidationResult } from './interfaces';
import { AuthRegistry } from './auth';

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  private authRegistry = new AuthRegistry();

  /**
   * Validate complete CLI configuration
   */
  validate(config: CliConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate auth configuration
    const authResult = this.validateAuth(config);
    errors.push(...authResult.errors);
    warnings.push(...authResult.warnings);

    // Validate plugins configuration
    const pluginsResult = this.validatePlugins(config);
    errors.push(...pluginsResult.errors);
    warnings.push(...pluginsResult.warnings);

    // Validate defaults configuration
    const defaultsResult = this.validateDefaults(config);
    errors.push(...defaultsResult.errors);
    warnings.push(...defaultsResult.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate authentication configuration
   */
  private validateAuth(config: CliConfig): ConfigValidationResult {
    if (!config.auth) {
      return {
        valid: false,
        errors: ['Authentication configuration is required'],
        warnings: [],
      };
    }

    return this.authRegistry.validateAuthConfig(config.auth);
  }

  /**
   * Validate plugins configuration
   */
  private validatePlugins(config: CliConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.plugins) {
      errors.push('Plugins configuration is required');
      return { valid: false, errors, warnings };
    }

    if (!config.plugins.formats || config.plugins.formats.length === 0) {
      errors.push('At least one format plugin must be configured');
      return { valid: false, errors, warnings };
    }

    // Validate each plugin specification
    for (const plugin of config.plugins.formats) {
      if (!plugin.name) {
        errors.push('Plugin name is required');
        continue;
      }

      if (!plugin.name.startsWith('@abapify/')) {
        warnings.push(
          `Plugin ${plugin.name} does not follow @abapify/* naming convention`,
        );
      }

      // Validate version if specified (version is optional on PluginSpec)
      const pluginWithVersion = plugin as {
        name: string;
        version?: string;
        config?: unknown;
      };
      if (
        pluginWithVersion.version &&
        !this.isValidSemver(pluginWithVersion.version)
      ) {
        warnings.push(
          `Plugin ${pluginWithVersion.name} has invalid version format: ${pluginWithVersion.version}`,
        );
      }

      // Validate plugin config if present
      if (plugin.config) {
        const configResult = this.validatePluginConfig(
          plugin.name,
          plugin.config,
        );
        errors.push(
          ...configResult.errors.map((err) => `${plugin.name}: ${err}`),
        );
        warnings.push(
          ...configResult.warnings.map((warn) => `${plugin.name}: ${warn}`),
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate defaults configuration
   */
  private validateDefaults(config: CliConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.defaults) {
      return { valid: true, errors, warnings };
    }

    // Validate default format
    if (config.defaults.format) {
      const availableFormats =
        config.plugins?.formats?.map((p) => p.name.replace('@abapify/', '')) ||
        [];
      if (!availableFormats.includes(config.defaults.format)) {
        errors.push(
          `Default format '${config.defaults.format}' is not in configured plugins`,
        );
      }
    }

    // Validate default output path
    if (
      config.defaults.outputPath &&
      !this.isValidPath(config.defaults.outputPath)
    ) {
      warnings.push(
        `Default output path may be invalid: ${config.defaults.outputPath}`,
      );
    }

    // Validate default object types
    if (config.defaults.objectTypes) {
      const validObjectTypes = [
        'CLAS',
        'INTF',
        'DOMA',
        'DEVC',
        'PROG',
        'FUGR',
        'TABL',
      ];
      for (const objectType of config.defaults.objectTypes) {
        if (!validObjectTypes.includes(objectType)) {
          warnings.push(`Unknown object type in defaults: ${objectType}`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate plugin-specific configuration
   */
  private validatePluginConfig(
    pluginName: string,
    config: any,
  ): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof config !== 'object' || config === null) {
      errors.push('Plugin config must be an object');
      return { valid: false, errors, warnings };
    }

    // Validate common plugin config properties
    if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      errors.push('Plugin enabled property must be boolean');
    }

    if (
      config.priority !== undefined &&
      (typeof config.priority !== 'number' || config.priority < 0)
    ) {
      errors.push('Plugin priority must be a non-negative number');
    }

    if (!config.options || typeof config.options !== 'object') {
      warnings.push('Plugin options should be an object');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if a string is a valid semver pattern
   */
  private isValidSemver(version: string): boolean {
    const semverRegex =
      /^(\^|~|>=|<=|>|<)?(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Check if a path is potentially valid
   */
  private isValidPath(path: string): boolean {
    // Basic path validation - check for invalid characters
    const invalidChars = /[<>:"|?*]/;
    return !invalidChars.test(path) && path.length > 0;
  }
}
