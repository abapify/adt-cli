/**
 * @abapify/adt-puppeteer
 *
 * Puppeteer-based SSO authentication plugin for ADT client.
 * Uses @abapify/browser-auth core with Puppeteer adapter.
 */

import type { AdtConfig, Destination } from '@abapify/adt-config';
import type { BrowserAuthOptions } from '@abapify/browser-auth';

// Re-export types
export type { PuppeteerCredentials, PuppeteerAuthOptions } from './puppeteer-auth';
export type { BrowserCredentials, BrowserAuthOptions, CookieData } from '@abapify/browser-auth';

/**
 * Plugin-level options applied to all destinations
 */
export type PuppeteerPluginOptions = BrowserAuthOptions;

/**
 * Create a puppeteer destination config
 */
function createPuppeteerDestination(options: BrowserAuthOptions): Destination {
  return {
    type: '@abapify/adt-puppeteer',
    options,
  };
}

/**
 * Wrap a standard config with puppeteer auth for all destinations.
 */
export function withPuppeteer(
  config: AdtConfig,
  options?: Partial<BrowserAuthOptions>
): AdtConfig {
  if (!config.destinations) {
    return config;
  }

  const destinations: Record<string, Destination> = {};

  for (const [name, dest] of Object.entries(config.destinations)) {
    if (typeof dest === 'object' && 'type' in dest) {
      if (dest.type === '@abapify/adt-puppeteer' || dest.type === 'puppeteer') {
        destinations[name] = {
          type: '@abapify/adt-puppeteer',
          options: { ...options, ...(dest.options as BrowserAuthOptions) },
        };
      } else {
        destinations[name] = dest;
      }
    } else if (typeof dest === 'string') {
      destinations[name] = createPuppeteerDestination({ url: dest, ...options });
    } else {
      destinations[name] = createPuppeteerDestination({ ...(dest as BrowserAuthOptions), ...options });
    }
  }

  return { ...config, destinations };
}

// Main exports
export { puppeteerAuth, puppeteer, toCookieHeader, toHeaders } from './puppeteer-auth';

// AuthManager compatibility exports
export { default } from './auth-plugin';
export { default as authPlugin } from './auth-plugin';
