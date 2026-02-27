/**
 * Auth Plugin Helpers
 *
 * Provides type-safe helpers for defining auth plugins.
 */

import type { AuthPlugin } from './types';

/**
 * Define an auth plugin with full type inference.
 *
 * Usage:
 * ```ts
 * import { defineAuthPlugin } from '@abapify/adt-config';
 *
 * interface MyOptions { url: string; }
 * interface MyCredentials { token: string; }
 *
 * export const myPlugin = defineAuthPlugin<MyOptions, MyCredentials>({
 *   name: 'my-auth',
 *   displayName: 'My Auth Method',
 *
 *   async authenticate(options) {
 *     // options is typed as MyOptions
 *     return { token: '...' };
 *   },
 *
 *   async test(credentials) {
 *     // credentials is typed as MyCredentials
 *     return { success: true };
 *   },
 * });
 * ```
 */
export function defineAuthPlugin<TOptions = unknown, TCredentials = unknown>(
  plugin: AuthPlugin<TOptions, TCredentials>,
): AuthPlugin<TOptions, TCredentials> {
  return plugin;
}
