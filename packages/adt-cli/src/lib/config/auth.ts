import { AdtClient, createAdtClient } from '@abapify/adt-client';
import {
  AuthConfig,
  BtpAuthConfig,
  BasicAuthConfig,
  MockAuthConfig,
  ConfigValidationResult,
} from './interfaces';
import fs from 'fs/promises';
import path from 'path';

/**
 * Authentication provider interface
 */
export interface AuthProvider {
  readonly type: string;

  /**
   * Create authenticated ADT Client
   */
  createClient(): Promise<AdtClient>;

  /**
   * Validate auth configuration
   */
  validateConfig(config: any): ConfigValidationResult;
}

/**
 * BTP service key authentication provider
 */
export class BtpAuthProvider implements AuthProvider {
  readonly type = 'btp';

  constructor(private config: BtpAuthConfig) {}

  async createClient(): Promise<AdtClient> {
    try {
      const serviceKeyPath = path.resolve(this.config.serviceKey);
      const serviceKeyContent = await fs.readFile(serviceKeyPath, 'utf-8');
      const serviceKey = JSON.parse(serviceKeyContent);

      return createAdtClient({
        baseUrl: serviceKey.url,
        username: serviceKey.uaa.clientid,
        password: serviceKey.uaa.clientsecret,
      });
    } catch (error) {
      throw new Error(
        `Failed to create BTP client: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  validateConfig(config: BtpAuthConfig): ConfigValidationResult {
    const errors: string[] = [];

    if (!config.serviceKey) {
      errors.push('BTP service key path is required');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

/**
 * Basic authentication provider
 */
export class BasicAuthProvider implements AuthProvider {
  readonly type = 'basic';

  constructor(private config: BasicAuthConfig) {}

  async createClient(): Promise<AdtClient> {
    return createAdtClient({
      baseUrl: this.config.host,
      username: this.config.username,
      password: this.config.password,
    });
  }

  validateConfig(config: BasicAuthConfig): ConfigValidationResult {
    const errors: string[] = [];

    if (!config.username) {
      errors.push('Username is required for basic auth');
    }

    if (!config.password) {
      errors.push('Password is required for basic auth');
    }

    if (!config.host) {
      errors.push('Host is required for basic auth');
    } else if (!config.host.startsWith('http')) {
      errors.push('Host must be a valid URL starting with http:// or https://');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

/**
 * Mock authentication provider for testing
 */
export class MockAuthProvider implements AuthProvider {
  readonly type = 'mock';

  constructor(private config: MockAuthConfig) {}

  async createClient(): Promise<AdtClient> {
    // Return a mock client for testing
    // Use config.enabled to potentially customize mock behavior
    const baseUrl = this.config.enabled
      ? 'http://mock-sap-system.local'
      : 'http://disabled-mock.local';

    return createAdtClient({
      baseUrl,
      username: 'mock-user',
      password: 'mock-password',
    });
  }

  validateConfig(config: MockAuthConfig): ConfigValidationResult {
    return {
      valid: true,
      errors: [],
      warnings: config.enabled ? [] : ['Mock auth is disabled'],
    };
  }
}

/**
 * Authentication registry
 */
export class AuthRegistry {
  private providers = new Map<string, new (config: any) => AuthProvider>();

  constructor() {
    this.register('btp', BtpAuthProvider);
    this.register('basic', BasicAuthProvider);
    this.register('mock', MockAuthProvider);
  }

  /**
   * Register an auth provider
   */
  register(
    type: string,
    providerClass: new (config: any) => AuthProvider,
  ): void {
    this.providers.set(type, providerClass);
  }

  /**
   * Get auth provider for type
   */
  getProvider(type: string, config: any): AuthProvider {
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      throw new Error(`Unknown auth type: ${type}`);
    }

    return new ProviderClass(config);
  }

  /**
   * Create authenticated client from config
   */
  async createClient(authConfig: AuthConfig): Promise<AdtClient> {
    const config = this.getAuthTypeConfig(authConfig);
    const provider = this.getProvider(authConfig.type, config);

    return provider.createClient();
  }

  /**
   * Validate auth configuration
   */
  validateAuthConfig(authConfig: AuthConfig): ConfigValidationResult {
    try {
      const config = this.getAuthTypeConfig(authConfig);
      const provider = this.getProvider(authConfig.type, config);

      return provider.validateConfig(config);
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : 'Unknown validation error',
        ],
        warnings: [],
      };
    }
  }

  /**
   * Get supported auth types
   */
  getSupportedTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Extract type-specific config from auth config
   */
  private getAuthTypeConfig(authConfig: AuthConfig): any {
    switch (authConfig.type) {
      case 'btp':
        return authConfig.btp;
      case 'basic':
        return authConfig.basic;
      case 'mock':
        return authConfig.mock;
      default:
        throw new Error(`Unknown auth type: ${authConfig.type}`);
    }
  }
}
