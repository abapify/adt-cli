/**
 * Authentication Manager
 *
 * Single source of truth for authentication across all consumers:
 * - CLI
 * - MCP Server
 * - Other tools
 */

import type {
  AuthSession,
  CookieCredentials,
  AuthPlugin,
  AuthPluginOptions,
  AuthPluginResult,
} from './types';
import { FileStorage } from './storage/file-storage';

/**
 * Destination configuration (from adt.config.ts)
 */
export interface Destination {
  /** Plugin package to use (e.g., '@abapify/adt-puppeteer', '@abapify/adt-auth/basic') */
  type: string;
  /** Plugin-specific options */
  options: AuthPluginOptions;
}

export class AuthManager {
  private storage: FileStorage;

  constructor(storage?: FileStorage) {
    this.storage = storage || new FileStorage();
  }

  // ===========================================================================
  // Login - Main entry point
  // ===========================================================================

  /**
   * Login using a destination configuration
   *
   * Dynamically loads the plugin specified in destination.type and authenticates.
   *
   * @param sid - System ID (e.g., 'BHF', 'S0D')
   * @param destination - Destination config with plugin type and options
   */
  async login(sid: string, destination: Destination): Promise<AuthSession> {
    // Dynamic import of the auth plugin
    const pluginModule = (await import(destination.type)) as {
      authPlugin: AuthPlugin;
    };

    if (!pluginModule.authPlugin?.authenticate) {
      throw new Error(
        `Plugin ${destination.type} does not export authPlugin.authenticate`,
      );
    }

    // Authenticate using the plugin
    const result = await pluginModule.authPlugin.authenticate(
      destination.options,
    );

    // Build session based on result type
    const session = this.buildSession(sid, destination, result);

    // Save session
    this.saveSession(session);

    // Set as default if first system
    if (this.listSids().length === 1) {
      this.setDefaultSid(sid);
    }

    return session;
  }

  /**
   * Build session from plugin result
   */
  private buildSession(
    sid: string,
    destination: Destination,
    result: AuthPluginResult,
  ): AuthSession {
    if (result.method === 'cookie') {
      return {
        sid: sid.toUpperCase(),
        host: destination.options.url,
        client: destination.options.client,
        auth: {
          method: 'cookie',
          plugin: destination.type,
          pluginOptions: destination.options, // Store full plugin options for refresh fallback
          credentials: {
            cookies: result.credentials.cookies,
            expiresAt: result.credentials.expiresAt.toISOString(),
          },
        },
      };
    } else {
      return {
        sid: sid.toUpperCase(),
        host: destination.options.url,
        client: destination.options.client,
        auth: {
          method: 'basic',
          plugin: destination.type,
          pluginOptions: destination.options, // Store full plugin options for consistency
          credentials: result.credentials,
        },
      };
    }
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  /**
   * Save a session (after successful authentication)
   */
  saveSession(session: AuthSession): void {
    this.storage.save(session);
  }

  /**
   * Get session by SID
   */
  getSession(sid?: string): AuthSession | null {
    const targetSid = sid || this.getDefaultSid();
    if (!targetSid) {
      return null;
    }
    return this.storage.load(targetSid);
  }

  /**
   * Delete session (logout)
   */
  deleteSession(sid: string): void {
    this.storage.delete(sid);
  }

  /**
   * List all available SIDs
   */
  listSids(): string[] {
    return this.storage.list();
  }

  // ===========================================================================
  // Default SID Management
  // ===========================================================================

  /**
   * Set default SID (persisted to config)
   */
  setDefaultSid(sid: string): void {
    this.storage.setDefaultSid(sid);
  }

  /**
   * Get default SID
   */
  getDefaultSid(): string | null {
    return this.storage.getDefaultSid() || (this.storage.list()[0] ?? null);
  }

  /**
   * Clear default SID
   */
  clearDefaultSid(): void {
    this.storage.clearDefaultSid();
  }

  // ===========================================================================
  // Credential Helpers
  // ===========================================================================

  /**
   * Check if session credentials are expired
   */
  isExpired(session: AuthSession): boolean {
    if (session.auth.method !== 'cookie') {
      return false; // Basic auth doesn't expire
    }
    const creds = session.auth.credentials as CookieCredentials;
    return new Date(creds.expiresAt) < new Date();
  }

  /**
   * Refresh credentials using the auth plugin
   *
   * @returns Updated session with new credentials, or null if refresh not supported/failed
   */
  async refreshCredentials(
    session: AuthSession,
    options?: { log?: (message: string) => void },
  ): Promise<AuthSession | null> {
    const log = options?.log ?? console.log;

    if (!session.auth.plugin) {
      return null; // No plugin = can't refresh
    }

    // Dynamic import of the auth plugin (expects default export)
    const pluginModule = (await import(session.auth.plugin)) as {
      default?: AuthPlugin;
    };

    if (!pluginModule.default) {
      throw new Error(
        `Plugin ${session.auth.plugin} does not have a default export`,
      );
    }

    const plugin = pluginModule.default;

    // Try plugin's refresh method first (preferred for session-based auth)
    if (plugin.refresh) {
      const sessionWithLog: AuthSession = {
        ...session,
        auth: {
          ...session.auth,
          pluginOptions: {
            url: session.host,
            client: session.client,
            ...session.auth.pluginOptions,
            log,
          },
        },
      };
      const result = await plugin.refresh(sessionWithLog);

      if (result) {
        // Refresh succeeded - build and save updated session
        // Preserve original plugin options (including userDataDir)
        const destination: Destination = {
          type: session.auth.plugin,
          options: session.auth.pluginOptions || {
            url: session.host,
            client: session.client,
          },
        };

        const updatedSession = this.buildSession(
          session.sid,
          destination,
          result,
        );
        this.saveSession(updatedSession);

        return updatedSession;
      }

      // Refresh failed - fall through to interactive authenticate
      log(
        '⚠️  Silent refresh failed - falling back to interactive authentication...',
      );
    }

    // Fallback: Call authenticate (full re-auth with browser interaction)
    // Use stored plugin options to preserve settings like userDataDir
    const baseOptions: AuthPluginOptions = session.auth.pluginOptions || {
      url: session.host,
      client: session.client,
    };
    const runtimeOptions = { ...baseOptions, log };

    const result = await plugin.authenticate(runtimeOptions);

    // Build destination for buildSession
    const destination: Destination = {
      type: session.auth.plugin,
      options: baseOptions,
    };

    // Build and save updated session
    const updatedSession = this.buildSession(session.sid, destination, result);
    this.saveSession(updatedSession);

    return updatedSession;
  }

  /**
   * Get cookie header for HTTP client (convenience method)
   */
  getCookieHeader(session: AuthSession): string | null {
    if (session.auth.method !== 'cookie') {
      return null;
    }
    const creds = session.auth.credentials as CookieCredentials;
    return creds.cookies;
  }

  /**
   * Get basic auth credentials (convenience method)
   */
  getBasicAuth(
    session: AuthSession,
  ): { username: string; password: string } | null {
    if (session.auth.method !== 'basic') {
      return null;
    }
    return session.auth.credentials as { username: string; password: string };
  }
}
