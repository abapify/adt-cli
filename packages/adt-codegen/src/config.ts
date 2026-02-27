/**
 * Config helpers
 */

import type { CodegenConfig } from './types';

/**
 * Define a codegen config with full type safety
 */
export function defineConfig(config: CodegenConfig): CodegenConfig {
  return config;
}

/**
 * Define an ADT config with codegen section
 */
export function defineAdtConfig<T extends { codegen: CodegenConfig }>(
  config: T,
): T {
  return config;
}
