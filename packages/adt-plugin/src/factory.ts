/**
 * ADT Plugin Factory
 *
 * Factory function for creating ADT plugins with validation.
 */

import type { AdtPlugin, AdtPluginDefinition } from './types';

/**
 * Create an ADT plugin with validation
 *
 * @param definition - Plugin definition
 * @returns Validated plugin instance
 *
 * @example
 * ```typescript
 * import { createPlugin } from '@abapify/adt-plugin';
 *
 * export const myPlugin = createPlugin({
 *   name: 'myFormat',
 *   version: '1.0.0',
 *   description: 'My custom format plugin',
 *
 *   registry: {
 *     isSupported: (type) => supportedTypes.includes(type),
 *     getSupportedTypes: () => supportedTypes,
 *   },
 *
 *   format: {
 *     import: async (object, targetPath, context) => {
 *       // Implementation
 *       return { success: true, filesCreated: [] };
 *     },
 *   },
 * });
 * ```
 */
export function createPlugin(definition: AdtPluginDefinition): AdtPlugin {
  // Validate required fields
  if (!definition.name) {
    throw new Error('Plugin name is required');
  }
  if (!definition.version) {
    throw new Error('Plugin version is required');
  }
  if (!definition.registry) {
    throw new Error('Plugin registry is required');
  }
  if (!definition.format) {
    throw new Error('Plugin format is required');
  }
  if (typeof definition.format.import !== 'function') {
    throw new Error('Plugin format.import must be a function');
  }

  // Return validated plugin
  return definition;
}
