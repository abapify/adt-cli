/**
 * Browser Auth Core
 *
 * Event-driven authentication logic shared by Playwright and Puppeteer adapters.
 * This module contains NO browser-specific code.
 */

import type {
  BrowserAdapter,
  BrowserAuthOptions,
  BrowserCredentials,
} from './types';
import {
  matchesCookiePattern,
  cookieMatchesAny,
  resolveUserDataDir,
} from './utils';

const DEFAULT_TIMEOUT = 300_000; // 5 minutes
const SYSTEM_INFO_PATH = '/sap/bc/adt/core/http/systeminformation';

export interface AuthenticateOptions extends BrowserAuthOptions {
  /** Callback for logging */
  log?: (message: string) => void;
}

/**
 * Authenticate using browser-based SSO
 *
 * This is the main entry point - it orchestrates the auth flow using the provided adapter.
 * The adapter handles browser-specific operations, this function handles the logic.
 */
export async function authenticate(
  adapter: BrowserAdapter,
  options: AuthenticateOptions,
): Promise<BrowserCredentials> {
  const {
    url,
    headless = false,
    timeout = DEFAULT_TIMEOUT,
    userAgent,
    requiredCookies,
    userDataDir,
    ignoreHTTPSErrors = true,
    log = console.log,
  } = options;

  const targetUrl = new URL(SYSTEM_INFO_PATH, url).toString();
  const sapHost = new URL(url).hostname;
  const profileDir = resolveUserDataDir(userDataDir);

  if (profileDir) {
    log(`🔄 Using persistent browser profile: ${profileDir}`);
  }

  try {
    // Step 1: Launch browser
    await adapter.launch({
      headless,
      userDataDir: profileDir,
      ignoreHTTPSErrors,
      userAgent,
    });

    log('🔍 Opening browser...');
    await adapter.newPage();

    // Step 2: Clear old SAP cookies to ensure we capture fresh ones
    // This is critical for re-authentication - old cookies may be stale
    log('🧹 Clearing old SAP cookies...');
    await adapter.clearCookies(sapHost);

    // Step 3: Wait for authentication (200 response from target URL AND required cookies)
    log('🌐 Complete SSO login if prompted...');

    const cookiesToWait =
      requiredCookies && requiredCookies.length > 0
        ? requiredCookies
        : ['SAP_SESSIONID_*']; // Default: wait for session cookie

    log(`⏳ Waiting for cookies: ${cookiesToWait.join(', ')}`);

    const sapCookies = await new Promise<
      Awaited<ReturnType<typeof adapter.getCookies>>
    >((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Authentication timeout - SSO not completed'));
      }, timeout);

      adapter.onPageClose(() => {
        clearTimeout(timeoutId);
        reject(new Error('Authentication cancelled - browser was closed'));
      });

      // Check for both 200 response AND required cookies on every response
      adapter.onResponse(async (event) => {
        // Only check on 200 responses from the target URL
        if (event.url === targetUrl && event.status === 200) {
          // Got 200 from target URL - now check if cookies are set
          const allCookies = await adapter.getCookies();
          const domainCookies = allCookies.filter(
            (c) =>
              c.domain.includes(sapHost) ||
              sapHost.includes(c.domain.replace(/^\./, '')),
          );
          const matchedCookies = domainCookies.filter((c) =>
            cookieMatchesAny(c.name, cookiesToWait),
          );
          const allFound = cookiesToWait.every((pattern) =>
            matchedCookies.some((c) => matchesCookiePattern(c.name, pattern)),
          );

          if (allFound) {
            clearTimeout(timeoutId);
            log('✅ Authentication complete!');
            log(
              `🍪 Found required cookies: ${matchedCookies.map((c) => c.name).join(', ')}`,
            );
            resolve(matchedCookies);
          }
          // If cookies not found yet, keep waiting for more responses
        }
      });

      // Navigate - events are already set up
      adapter.goto(targetUrl, { timeout: 30000 }).catch(() => {});
    });

    await adapter.closePage();

    // Validate cookies
    if (requiredCookies && requiredCookies.length > 0) {
      const missingPatterns = requiredCookies.filter(
        (pattern) =>
          !sapCookies.some((c) => matchesCookiePattern(c.name, pattern)),
      );
      if (missingPatterns.length > 0) {
        throw new Error(
          `Missing required cookies: ${missingPatterns.join(', ')}`,
        );
      }
    }

    if (sapCookies.length === 0) {
      throw new Error(
        'No SAP cookies captured - authentication may have failed',
      );
    }

    const cookieNames = sapCookies.map((c) => c.name).join(', ');
    log(`🍪 Captured ${sapCookies.length} cookies: ${cookieNames}`);

    // Get user agent
    const userAgentString = userAgent || (await adapter.getUserAgent());

    return {
      baseUrl: url,
      cookies: sapCookies,
      authenticatedAt: new Date(),
      userAgent: userAgentString,
    };
  } finally {
    await adapter.close();
  }
}

/**
 * Test if credentials are still valid
 */
export async function testCredentials(
  credentials: BrowserCredentials,
  options?: { timeout?: number },
): Promise<{ valid: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  const testUrl = new URL(SYSTEM_INFO_PATH, credentials.baseUrl);

  try {
    const cookieHeader = credentials.cookies
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    const response = await fetch(testUrl.toString(), {
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/xml',
      },
      signal: options?.timeout
        ? AbortSignal.timeout(options.timeout)
        : undefined,
    });

    const text = await response.text();

    // Check for SAML redirect (session expired)
    if (text.includes('SAMLRequest') || text.includes('SAMLResponse')) {
      return {
        valid: false,
        error: 'Session expired - SAML redirect detected',
        responseTime: Date.now() - startTime,
      };
    }

    return {
      valid: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Convert credentials to HTTP cookie header
 */
export function toCookieHeader(credentials: BrowserCredentials): string {
  return credentials.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * Convert credentials to HTTP headers object
 */
export function toHeaders(
  credentials: BrowserCredentials,
): Record<string, string> {
  return {
    Cookie: toCookieHeader(credentials),
    ...(credentials.userAgent ? { 'User-Agent': credentials.userAgent } : {}),
  };
}
