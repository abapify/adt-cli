/**
 * Browser Auth Utilities
 *
 * Cookie matching and path resolution utilities.
 */

import { homedir } from 'os';
import { join } from 'path';

const DEFAULT_USER_DATA_DIR = join(homedir(), '.adt', 'browser-profile');

/**
 * Resolve userDataDir configuration to an absolute path
 */
export function resolveUserDataDir(
  userDataDir?: string | boolean,
): string | undefined {
  if (userDataDir === true) {
    return DEFAULT_USER_DATA_DIR;
  }
  if (typeof userDataDir === 'string') {
    return userDataDir;
  }
  return undefined;
}

/**
 * Check if a cookie name matches a pattern (supports * wildcard)
 * @example matchesCookiePattern('SAP_SESSIONID_S0D_200', 'SAP_SESSIONID_*') // true
 */
export function matchesCookiePattern(
  cookieName: string,
  pattern: string,
): boolean {
  if (!pattern.includes('*')) {
    return cookieName === pattern;
  }
  const regexPattern = pattern.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`).test(cookieName);
}

/**
 * Check if a cookie matches any of the required patterns
 */
export function cookieMatchesAny(
  cookieName: string,
  patterns: string[],
): boolean {
  return patterns.some((pattern) => matchesCookiePattern(cookieName, pattern));
}
