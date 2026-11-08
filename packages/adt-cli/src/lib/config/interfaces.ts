// Plugin interfaces defined locally for better TypeScript support

/**
 * CLI configuration interface
 */
export interface CliConfig {
  auth: AuthConfig;
  plugins: PluginsConfig;
  defaults?: DefaultsConfig;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: 'btp' | 'basic' | 'mock';
  btp?: BtpAuthConfig;
  basic?: BasicAuthConfig;
  mock?: MockAuthConfig;
}

/**
 * BTP service key authentication
 */
export interface BtpAuthConfig {
  serviceKey: string; // Path to service key file
}

/**
 * Basic authentication
 */
export interface BasicAuthConfig {
  username: string;
  password: string;
  host: string;
}

/**
 * Mock authentication for testing
 */
export interface MockAuthConfig {
  enabled: boolean;
  mockData?: string; // Path to mock data directory
}

/**
 * Plugins configuration
 */
export interface PluginsConfig {
  formats: PluginSpec[];
}

/**
 * Enhanced plugin specification with TypeScript support
 */
export interface PluginSpec {
  name: string;
  config?: {
    enabled?: boolean;
    options?: Record<string, any>;
  };
}

/**
 * Type-safe plugin options for common formats
 */
export interface OatPluginOptions {
  fileStructure?: 'flat' | 'grouped' | 'hierarchical';
  includeMetadata?: boolean;
  packageMapping?: Record<
    string,
    string | ((remotePkg: string, context?: any) => string)
  > & {
    transform?: (remotePkg: string, context?: any) => string;
  };
  objectFilters?: {
    include?: string[];
    exclude?: string[];
  };
}

export interface AbapGitPluginOptions {
  xmlFormat?: boolean;
  includeInactive?: boolean;
  packageStructure?: boolean;
}

export interface CustomPluginOptions {
  auditLogging?: boolean;
  encryptSensitiveData?: boolean;
  complianceMode?: 'SOX' | 'GDPR' | 'HIPAA';
}

/**
 * Generic plugin options interface for extensibility
 */
export interface GenericPluginOptions {
  [key: string]: any;
}

/**
 * Default settings with enhanced type safety
 */
export interface DefaultsConfig {
  format?: string;
  outputPath?: string;
  // 'CLAS' Classes, 'INTF' Interfaces, 'FUGR' Function Groups, 'DDLS' CDS Views,
  // 'TABL' Tables, 'PROG' Programs, 'FORM' Forms, 'DEVC' Packages — or custom types
  objectTypes?: Array<string>;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration loader interface
 */
export interface ConfigLoader {
  /**
   * Load configuration from file
   */
  load(configPath?: string): Promise<CliConfig>;

  /**
   * Validate configuration
   */
  validate(config: CliConfig): ConfigValidationResult;

  /**
   * Get default configuration
   */
  getDefault(): CliConfig;

  /**
   * Save configuration to file
   */
  save(config: CliConfig, configPath?: string): Promise<void>;
}
