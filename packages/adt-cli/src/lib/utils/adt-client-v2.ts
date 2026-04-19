/**
 * Utility for initializing ADT Client V2 in CLI commands
 *
 * This module provides CLI-specific auth integration for the v2 client.
 * It bridges the gap between CLI's auth management and v2's pure client API.
 *
 * Architecture Note:
 * - CLI handles auth management (via v1 AuthManager stored in ~/.adt/auth.json)
 * - This module extracts credentials and creates v2 client
 * - v2 client remains pure (no CLI/file I/O dependencies)
 *
 * Shared state (context, loggers, capture) is in shared/adt-client.ts
 */
import {
  createAdtClient,
  LoggingPlugin,
  FileLoggingPlugin,
  type Logger,
  type ResponseContext,
  type AdtClient,
} from '@abapify/adt-client';
import type { AdtAdapterConfig } from '@abapify/adt-client';
import { initializeAdk, isAdkInitialized } from '@abapify/adk';
import { FileLockStore } from '@abapify/adt-locks';
import {
  loadAuthSession,
  isExpired,
  refreshCredentials,
  type CookieCredentials,
  type BasicCredentials,
  type AuthSession,
} from './auth';
import {
  createProgressReporter,
  type ProgressReporter,
} from './progress-reporter';
import { setAdtSystem } from '../ui/components/link';

// Re-export shared state from shared/adt-client.ts for backward compatibility
export {
  type CliContext,
  setCliContext,
  getCliContext,
  resetCliContext,
  silentLogger,
  consoleLogger,
  type CapturedResponse,
  getCaptured,
  setCaptured,
  resetCaptured,
} from '../shared/adt-client';

import {
  getCliContext,
  silentLogger,
  consoleLogger,
  setCaptured,
  resetCaptured,
} from '../shared/adt-client';

// =============================================================================
// Test DI hook (internal, used by tests/e2e harness)
// =============================================================================

/**
 * Stack of test overrides. Using a stack (instead of a single mutable slot)
 * means nested / concurrent harness instances don't clobber each other's
 * clients, and teardown is strict: each `__setTestAdtClient` call returns a
 * `release` function that removes *only that* override, regardless of order.
 *
 * Concurrency note: Vitest's default `threads` pool gives each worker its
 * own module graph, so in practice this state is already isolated per
 * worker. But a stack keeps us safe if:
 *   - a suite uses `test.concurrent` (shared module, shared state)
 *   - the pool config is changed to `forks: { singleFork: false }` or similar
 *   - multiple harnesses are constructed within a single test
 * which is why we prefer a stack + explicit release handle here.
 */
const __testAdtClientOverrides: AdtClient[] = [];

/**
 * @internal
 * Install a test AdtClient instance. When set, `getAdtClientV2()` will return
 * the most recently pushed client instead of loading credentials from disk and
 * constructing a real client. Intended solely for e2e harness usage.
 *
 * Returns a `release` function that removes **this specific** override from
 * the stack. Callers (harness teardown) MUST call `release()` in an
 * `afterEach` / `afterAll` / `finally` block.
 *
 * Backward compatibility: passing `null` pops the top of the stack (legacy
 * behaviour used by older harness code paths). New code should prefer the
 * returned release handle.
 */
export function __setTestAdtClient(client: AdtClient | null): () => void {
  if (client === null) {
    // Legacy clear semantics: pop the most recent override.
    __testAdtClientOverrides.pop();
    return () => {
      /* no-op: legacy clear has already happened */
    };
  }

  __testAdtClientOverrides.push(client);
  let released = false;
  return function release(): void {
    if (released) return;
    released = true;
    const idx = __testAdtClientOverrides.lastIndexOf(client);
    if (idx !== -1) __testAdtClientOverrides.splice(idx, 1);
  };
}

/**
 * @internal
 * Inspect the current test override (mostly for diagnostics / test cleanup).
 * Returns the top of the stack, or `null` if no override is active.
 */
export function __getTestAdtClient(): AdtClient | null {
  return __testAdtClientOverrides.length > 0
    ? __testAdtClientOverrides[__testAdtClientOverrides.length - 1]
    : null;
}

function __getActiveTestAdtClient(): AdtClient | undefined {
  return __testAdtClientOverrides[__testAdtClientOverrides.length - 1];
}

// =============================================================================
// Client Options
// =============================================================================

/**
 * Options for creating ADT v2 client
 */
export interface AdtClientV2Options {
  /** Optional response plugins (added after built-in plugins) */
  plugins?: AdtAdapterConfig['plugins'];
  /** Optional logger for CLI messages (defaults to global CLI logger or silent) */
  logger?: Logger;
  /** Enable request/response logging (default: from CLI --verbose flag) */
  enableLogging?: boolean;
  /** Enable response file logging (default: from CLI --log-response-files flag) */
  logResponseFiles?: boolean;
  /** Output directory for response files (default: from CLI --log-output flag or './tmp/logs') */
  logOutput?: string;
  /** Write metadata alongside response files (default: false) */
  writeMetadata?: boolean;
  /** SAP System ID (SID) - e.g., 'BHF', 'S0D' (default: from CLI --sid flag) */
  sid?: string;
  /** Enable capture plugin to capture raw XML and parsed JSON (default: false) */
  capture?: boolean;
  /** Enable automatic SAML re-authentication when session expires (default: true for cookie auth) */
  autoReauth?: boolean;
  /** Pass through verbose flag (used to disable compact progress output) */
  verbose?: boolean | string;
}

/**
 * Try to auto-refresh expired session credentials
 *
 * @param session - The expired session
 * @param sid - Optional SID for error messages
 * @returns Updated session with fresh credentials
 */
async function tryAutoRefresh(
  session: AuthSession,
  sid: string | undefined,
  progress: ProgressReporter,
): Promise<AuthSession> {
  // Check if plugin is available for refresh
  if (!session.auth.plugin) {
    console.error('❌ Session expired');
    console.error('💡 Run "npx adt auth login" to re-authenticate');
    process.exit(1);
  }

  progress.step(`🔄 Session expired for ${session.sid}, refreshing...`);

  try {
    const refreshedSession = await refreshCredentials(session, {
      log: progress.persist,
    });
    if (!refreshedSession) {
      throw new Error('Refresh returned null');
    }
    progress.clear(); // Silent on success - don't clutter output
    return refreshedSession;
  } catch (error) {
    progress.done('❌ Auto-refresh failed');
    console.error(
      '❌ Auto-refresh failed:',
      error instanceof Error ? error.message : String(error),
    );
    const sidArg = sid ? ` --sid=${sid}` : '';
    console.error(
      `💡 Run "npx adt auth login${sidArg}" to re-authenticate manually`,
    );
    process.exit(1);
  }
}

/**
 * Get authenticated ADT v2 client
 *
 * Loads auth session from CLI config and creates v2 client.
 * Automatically refreshes expired sessions when possible.
 * Exits with error if not authenticated.
 *
 * @param options - Optional configuration (plugins, logger, etc.)
 * @returns Authenticated ADT v2 client
 *
 * @example
 * // Simple usage
 * const client = await getAdtClientV2();
 *
 * @example
 * // With custom logger
 * const client = await getAdtClientV2({
 *   logger: myLogger,
 *   enableLogging: true  // Enable HTTP request/response logging
 * });
 *
 * @example
 * // With plugins
 * const client = await getAdtClientV2({
 *   plugins: [myPlugin]
 * });
 */
export async function getAdtClientV2(
  options?: AdtClientV2Options,
): Promise<AdtClient> {
  // Test DI hook: if a test harness has injected a client, return the
  // top-of-stack override. Must short-circuit BEFORE touching disk-based
  // auth / CLI context.
  const testOverride = __getActiveTestAdtClient();
  if (testOverride) {
    return testOverride;
  }

  // Merge with global CLI context (explicit options take precedence)
  const ctx = getCliContext();
  const effectiveOptions = {
    sid: options?.sid ?? ctx.sid,
    logger: options?.logger ?? ctx.logger,
    logResponseFiles: options?.logResponseFiles ?? ctx.logResponseFiles,
    logOutput: options?.logOutput ?? ctx.logOutput ?? './tmp/logs',
    enableLogging: options?.enableLogging,
    writeMetadata: options?.writeMetadata ?? false,
    capture: options?.capture ?? false,
    plugins: options?.plugins ?? [],
    autoReauth: options?.autoReauth ?? true, // Enable auto-reauth by default
    verbose: options?.verbose ?? ctx.verbose,
  };

  // Priority: 1) user-provided logger, 2) global CLI logger, 3) console if enableLogging, 4) silent
  const logger =
    effectiveOptions.logger ??
    (effectiveOptions.enableLogging ? consoleLogger : silentLogger);
  const progress = createProgressReporter({
    compact: !effectiveOptions.verbose,
    logger,
  });
  let session = loadAuthSession(effectiveOptions.sid);

  if (!session) {
    const sidMsg = effectiveOptions.sid
      ? ` for SID ${effectiveOptions.sid}`
      : '';
    console.error(`❌ Not authenticated${sidMsg}`);
    console.error(
      `💡 Run "npx adt auth login${effectiveOptions.sid ? ` --sid=${effectiveOptions.sid}` : ''}" to authenticate first`,
    );
    process.exit(1);
  }

  // Set system name for ADT hyperlinks (e.g., adt://S0D/sap/bc/adt/...)
  setAdtSystem(session.sid);

  // Extract credentials based on auth method
  const baseUrl = session.host;
  const client = session.client;
  let username: string | undefined;
  let password: string | undefined;
  let cookieHeader: string | undefined;
  let authorizationHeader: string | undefined;

  if (session.auth.method === 'basic') {
    const creds = session.auth.credentials as BasicCredentials;
    username = creds.username;
    password = creds.password;
  } else if (session.auth.method === 'cookie') {
    // Check if session is expired - try auto-refresh first
    if (isExpired(session)) {
      session = await tryAutoRefresh(session, effectiveOptions.sid, progress);
    }

    const creds = session.auth.credentials as CookieCredentials;
    // Decode URL-encoded cookie values (e.g., %3d -> =)
    const rawCookies = decodeURIComponent(creds.cookies);

    const AUTH_PREFIX = 'Authorization: ';
    if (rawCookies.startsWith(AUTH_PREFIX)) {
      // Bearer token from OAuth (e.g., BTP service key auth) — pass as
      // Authorization header, not as a Cookie
      authorizationHeader = rawCookies.substring(AUTH_PREFIX.length);
    } else {
      cookieHeader = rawCookies;
    }
  } else {
    console.error(`❌ Unsupported auth method: ${session.auth.method}`);
    process.exit(1);
  }

  // Build plugin list: built-in plugins first, then user plugins
  const plugins: AdtAdapterConfig['plugins'] = [];

  // Add capture plugin if enabled (must be first to capture before other plugins)
  if (effectiveOptions.capture) {
    resetCaptured();
    plugins.push({
      name: 'capture',
      process: (context: ResponseContext) => {
        setCaptured({
          xml: context.rawText,
          json: context.parsedData,
        });
        return context.parsedData;
      },
    });
  }

  // Add file logging plugin if enabled
  if (effectiveOptions.logResponseFiles) {
    plugins.push(
      new FileLoggingPlugin({
        outputDir: effectiveOptions.logOutput,
        writeMetadata: effectiveOptions.writeMetadata,
        logger,
      }),
    );
  }

  // Add console logging plugin if enabled
  if (effectiveOptions.enableLogging) {
    plugins.push(
      new LoggingPlugin((msg, data) => {
        logger.info(`${msg}${data ? ` ${JSON.stringify(data)}` : ''}`);
      }),
    );
  }

  // Add user-provided plugins last
  plugins.push(...effectiveOptions.plugins);

  // Create onSessionExpired callback for automatic SAML re-authentication
  // Only applicable for cookie-based auth with a plugin that can refresh
  let onSessionExpired: (() => Promise<string>) | undefined;

  if (
    effectiveOptions.autoReauth &&
    session.auth.method === 'cookie' &&
    session.auth.plugin
  ) {
    // Capture current session for the callback closure
    let currentSession = session;
    let refreshAttempts = 0;
    const MAX_REFRESH_ATTEMPTS = 1;

    onSessionExpired = async (): Promise<string> => {
      refreshAttempts++;

      if (refreshAttempts > MAX_REFRESH_ATTEMPTS) {
        const error = new Error(
          `Maximum refresh attempts (${MAX_REFRESH_ATTEMPTS}) exceeded`,
        );
        console.error('❌ Auto-refresh failed: Too many attempts');
        const sidArg = effectiveOptions.sid
          ? ` --sid=${effectiveOptions.sid}`
          : '';
        console.error(
          `💡 Run "npx adt auth login${sidArg}" to re-authenticate manually`,
        );
        throw error;
      }

      progress.step(
        `🔄 Session expired, refreshing credentials for ${currentSession.sid}... (attempt ${refreshAttempts}/${MAX_REFRESH_ATTEMPTS})`,
      );

      try {
        // Refresh credentials using the auth plugin (opens browser for SAML)
        const refreshedSession = await refreshCredentials(currentSession, {
          log: progress.persist,
        });
        if (!refreshedSession) {
          throw new Error('Refresh returned null');
        }
        currentSession = refreshedSession;

        // Extract new cookie from refreshed session
        const creds = currentSession.auth.credentials as CookieCredentials;
        const newCookie = decodeURIComponent(creds.cookies);

        progress.clear(); // Silent on success - don't clutter output
        // DON'T reset counter - if cookies don't work, we'll hit the limit
        return newCookie;
      } catch (error) {
        progress.done('❌ Auto-refresh failed');
        console.error(
          '❌ Auto-refresh failed:',
          error instanceof Error ? error.message : String(error),
        );
        const sidArg = effectiveOptions.sid
          ? ` --sid=${effectiveOptions.sid}`
          : '';
        console.error(
          `💡 Run "npx adt auth login${sidArg}" to re-authenticate manually`,
        );
        throw error;
      }
    };
  }

  const adtClient = createAdtClient({
    baseUrl,
    username,
    password,
    cookieHeader,
    authorizationHeader,
    client,
    logger,
    plugins,
    onSessionExpired,
  });

  // Initialize ADK global context if not already done
  // This allows ADK objects to be used without passing context explicitly
  if (!isAdkInitialized()) {
    initializeAdk(adtClient, { lockStore: new FileLockStore() });
  }

  return adtClient;
}
