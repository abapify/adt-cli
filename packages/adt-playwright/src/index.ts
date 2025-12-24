/**
 * @abapify/adt-playwright
 *
 * Playwright-based SSO authentication plugin for ADT client.
 * Uses @abapify/browser-auth core with Playwright adapter.
 */

import type { AdtConfig, Destination } from '@abapify/adt-config';
import type { BrowserAuthOptions } from '@abapify/browser-auth';

// Re-export types
export type { PlaywrightCredentials, PlaywrightAuthOptions } from './playwright-auth';
export type { BrowserCredentials, BrowserAuthOptions, CookieData } from '@abapify/browser-auth';

/**
 * Plugin-level options applied to all destinations
 */
export type PlaywrightPluginOptions = BrowserAuthOptions;

/**
 * Create a playwright destination config
 */
function createPlaywrightDestination(options: BrowserAuthOptions): Destination {
  return {
    type: '@abapify/adt-playwright',
    options,
  };
}

/**
 * Wrap a standard config with playwright auth for all destinations.
 */
export function withPlaywright(
  config: AdtConfig,
  options?: Partial<BrowserAuthOptions>
): AdtConfig {
  if (!config.destinations) {
    return config;
  }

  const destinations: Record<string, Destination> = {};

  for (const [name, dest] of Object.entries(config.destinations)) {
    if (typeof dest === 'object' && 'type' in dest) {
      if (dest.type === '@abapify/adt-playwright' || dest.type === 'playwright') {
        destinations[name] = {
          type: '@abapify/adt-playwright',
          options: { ...options, ...(dest.options as BrowserAuthOptions) },
        };
      } else {
        destinations[name] = dest;
      }
    } else if (typeof dest === 'string') {
      destinations[name] = createPlaywrightDestination({ url: dest, ...options });
    } else {
      destinations[name] = createPlaywrightDestination({ ...(dest as BrowserAuthOptions), ...options });
    }
  }

  return { ...config, destinations };
}

// Main exports
export { playwrightAuth, playwright, toCookieHeader, toHeaders } from './playwright-auth';

// AuthManager compatibility exports
export { default } from './auth-plugin';
export { default as authPlugin } from './auth-plugin';
