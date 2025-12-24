/**
 * Core types for ADT authentication
 * 
 * Session format is the single source of truth for all consumers
 * (CLI, MCP server, other tools)
 */

// =============================================================================
// Auth Methods - What the HTTP client uses
// =============================================================================

/**
 * Authentication method types
 * - basic: username/password
 * - cookie: session cookies (from browser SSO, etc.)
 */
export type AuthMethod = 'basic' | 'cookie';

/**
 * Basic authentication credentials
 */
export interface BasicCredentials {
  username: string;
  password: string;
}

/**
 * Cookie-based authentication credentials
 */
export interface CookieCredentials {
  cookies: string;      // Cookie header value
  expiresAt: string;    // ISO date string
}

/**
 * Union of all credential types
 */
export type Credentials = BasicCredentials | CookieCredentials;

// =============================================================================
// Auth Configuration - Stored in session
// =============================================================================

/**
 * Auth configuration in session file
 *
 * - `method`: What the HTTP client uses ("cookie" | "basic")
 * - `plugin`: Package to dynamically import for refresh (optional)
 * - `pluginOptions`: Original plugin options (for refresh fallback)
 * - `credentials`: Method-specific credentials
 */
export interface AuthConfig {
  method: AuthMethod;
  plugin?: string;  // e.g., "@abapify/adt-puppeteer" - for refresh
  pluginOptions?: AuthPluginOptions;  // Original options (url, userDataDir, etc.)
  credentials: Credentials;
}

// =============================================================================
// Session Format - Single source of truth
// =============================================================================

/**
 * Authentication session stored in ~/.adt/sessions/<SID>.json
 * 
 * This is the canonical format used by all consumers:
 * - CLI
 * - MCP Server
 * - Other tools
 */
export interface AuthSession {
  sid: string;
  host: string;
  client?: string;
  auth: AuthConfig;
}

// =============================================================================
// Auth Plugin Interface - For dynamic credential refresh
// =============================================================================

/**
 * Auth plugin interface for credential providers
 * 
 * Plugins are dynamically imported when:
 * - Initial authentication (login)
 * - Credential refresh (when expired)
 */
export interface AuthPlugin {
  /** Authenticate and return credentials */
  authenticate(options: AuthPluginOptions): Promise<AuthPluginResult>;

  /** Optional: Refresh existing credentials (for session-based auth) */
  refresh?(session: AuthSession): Promise<AuthPluginResult | null>;
}

export interface AuthPluginOptions {
  url: string;
  client?: string;
  [key: string]: unknown;  // Plugin-specific options
}

/** Cookie-based auth result (from browser SSO plugins) */
export interface CookieAuthResult {
  method: 'cookie';
  credentials: {
    cookies: string;
    expiresAt: Date;
  };
}

/** Basic auth result (from basic auth plugin) */
export interface BasicAuthResult {
  method: 'basic';
  credentials: {
    username: string;
    password: string;
  };
}

/** Union of all plugin results */
export type AuthPluginResult = CookieAuthResult | BasicAuthResult;

// =============================================================================
// Connection Test
// =============================================================================

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  responseTime?: number;
}

