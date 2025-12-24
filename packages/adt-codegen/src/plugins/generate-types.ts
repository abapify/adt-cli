/**
 * Generate Types Plugin
 *
 * Generates TypeScript types from collections
 */

import { definePlugin } from '../plugin';

export const generateTypesPlugin = definePlugin({
  name: 'generate-types',

  hooks: {
    collection(coll) {
      // Generate type name from category
      const typeName = coll.category.term
        ? toPascalCase(coll.category.term)
        : toPascalCase(coll.title);

      // Generate interface
      const typeDefinition = `
/**
 * ${coll.title}
 * Endpoint: ${coll.href}
 */
export interface ${typeName} {
  // NOTE: Could add properties based on content-type in future
  // Content-Types: ${coll.accepts.join(', ') || 'none'}
}

export interface ${typeName}Request {
  // NOTE: Could add request parameters in future
}

export interface ${typeName}Response {
  data: ${typeName};
}
`;

      // Generate safe filename
      const filename = (coll.category.term || 'collection')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

      // Add to workspace artifacts
      coll.workspace.artifacts.push({
        file: `${filename}.types.ts`,
        content: typeDefinition,
      });
    },

    async finalize(ctx) {
      ctx.logger.success(
        `Generated types for ${ctx.workspaces.length} workspaces`
      );
    },
  },
});

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
