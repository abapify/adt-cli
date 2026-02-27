import {
  CliConfig,
  ConfigLoader as IConfigLoader,
  ConfigValidationResult,
} from './interfaces';
import { AuthRegistry } from './auth';
import { pathToFileURL } from 'url';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export class ConfigLoader implements IConfigLoader {
  private static cache = new Map<string, CliConfig>();
  private authRegistry = new AuthRegistry();

  /**
   * Load configuration from file
   */
  async load(configPath?: string): Promise<CliConfig> {
    const resolvedPath = configPath || (await this.findConfigFile());

    if (!resolvedPath) {
      return this.getDefault();
    }

    // Check cache first
    if (ConfigLoader.cache.has(resolvedPath)) {
      return ConfigLoader.cache.get(resolvedPath)!;
    }

    try {
      const config = await this.loadConfigFile(resolvedPath);

      // Validate the loaded config
      const validation = this.validate(config);
      if (!validation.valid) {
        throw new Error(
          `Invalid configuration: ${validation.errors.join(', ')}`,
        );
      }

      // Cache the result
      ConfigLoader.cache.set(resolvedPath, config);

      return config;
    } catch (error) {
      throw new Error(
        `Failed to load config from ${resolvedPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Validate configuration
   */
  validate(config: CliConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate auth config
    if (!config.auth) {
      errors.push('Authentication configuration is required');
    } else {
      const authValidation = this.authRegistry.validateAuthConfig(config.auth);
      errors.push(...authValidation.errors);
      warnings.push(...authValidation.warnings);
    }

    // Validate plugins config
    if (
      !config.plugins ||
      !config.plugins.formats ||
      config.plugins.formats.length === 0
    ) {
      errors.push('At least one format plugin must be configured');
    } else {
      for (const plugin of config.plugins.formats) {
        if (!plugin.name) {
          errors.push('Plugin name is required');
        }
        if (!plugin.name.startsWith('@abapify/')) {
          warnings.push(
            `Plugin ${plugin.name} does not follow @abapify/* naming convention`,
          );
        }
      }
    }

    // Validate defaults
    if (config.defaults?.format) {
      const availableFormats = config.plugins.formats.map((p) =>
        p.name.replace('@abapify/', ''),
      );
      if (!availableFormats.includes(config.defaults.format)) {
        errors.push(
          `Default format '${config.defaults.format}' is not in configured plugins`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get default configuration
   */
  getDefault(): CliConfig {
    return {
      auth: {
        type: 'mock',
        mock: {
          enabled: true,
        },
      },
      plugins: {
        formats: [
          {
            name: '@abapify/oat',
            config: {
              enabled: true,
              options: {
                fileStructure: 'hierarchical',
                includeMetadata: true,
              },
            },
          },
        ],
      },
      defaults: {
        format: 'oat',
      },
    };
  }

  /**
   * Save configuration to file
   */
  async save(config: CliConfig, configPath?: string): Promise<void> {
    const resolvedPath =
      configPath || path.join(process.cwd(), 'adt.config.yaml');

    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    await fs.writeFile(resolvedPath, yamlContent, 'utf-8');

    // Update cache
    ConfigLoader.cache.set(resolvedPath, config);
  }

  /**
   * Find configuration file
   */
  private async findConfigFile(): Promise<string | null> {
    const configNames = ['adt.config.ts', 'adt.config.yaml', 'adt.config.yml'];

    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      for (const configName of configNames) {
        const configPath = path.join(currentDir, configName);
        try {
          await fs.access(configPath);
          return configPath;
        } catch {
          // File doesn't exist, continue
        }
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Load configuration file based on extension
   */
  private async loadConfigFile(configPath: string): Promise<CliConfig> {
    const ext = path.extname(configPath);

    if (ext === '.yaml' || ext === '.yml') {
      return this.loadYamlConfig(configPath);
    } else if (ext === '.ts') {
      return this.loadTsConfig(configPath);
    } else {
      throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  /**
   * Load YAML configuration
   */
  private async loadYamlConfig(configPath: string): Promise<CliConfig> {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(content) as CliConfig;

    // Process environment variables
    return this.processEnvironmentVariables(config);
  }

  /**
   * Load TypeScript configuration
   */
  private async loadTsConfig(configPath: string): Promise<CliConfig> {
    const configUrl = pathToFileURL(configPath).href;
    const configModule = await import(configUrl);
    const config = configModule.default || {};

    return this.processEnvironmentVariables(config);
  }

  /**
   * Process environment variables in config
   */
  private processEnvironmentVariables(config: any): any {
    const processValue = (value: any): any => {
      if (
        typeof value === 'string' &&
        value.startsWith('${') &&
        value.endsWith('}')
      ) {
        const envVar = value.slice(2, -1);
        return process.env[envVar] || value;
      } else if (typeof value === 'object' && value !== null) {
        const processed: any = Array.isArray(value) ? [] : {};
        for (const [key, val] of Object.entries(value)) {
          processed[key] = processValue(val);
        }
        return processed;
      }
      return value;
    };

    return processValue(config);
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
