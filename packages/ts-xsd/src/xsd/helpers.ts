/**
 * Schema Helpers
 *
 * Utility functions for working with Schema objects,
 * particularly for resolving cross-schema relationships.
 */

import type { Schema } from './types';

/**
 * Resolve $imports for a schema by matching import schemaLocation to $filename.
 *
 * @param schema - The schema to resolve imports for
 * @param availableSchemas - Array of schemas that may be imported
 * @returns A new schema object with $imports populated
 *
 * @example
 * ```typescript
 * const orderSchema = parseXsd(orderXsd);
 * const commonSchema = { ...parseXsd(commonXsd), $filename: 'common.xsd' };
 *
 * // orderSchema has: import: [{ schemaLocation: 'common.xsd', ... }]
 * const resolved = resolveImports(orderSchema, [commonSchema]);
 * // resolved.$imports = [commonSchema]
 * ```
 */
export function resolveImports<T extends Schema>(
  schema: T,
  availableSchemas: readonly Schema[],
): T & { $imports: readonly Schema[] } {
  const imports: Schema[] = [];

  if (schema.import) {
    for (const imp of schema.import) {
      if (imp.schemaLocation) {
        // Find schema by $filename match
        const found = availableSchemas.find(
          (s) => s.$filename === imp.schemaLocation,
        );
        if (found) {
          imports.push(found);
        }
      }
    }
  }

  return {
    ...schema,
    $imports: imports,
  };
}

/**
 * Resolve $imports for multiple schemas, linking them together.
 *
 * @param schemas - Array of schemas to link together
 * @returns Array of schemas with $imports populated
 *
 * @example
 * ```typescript
 * const schemas = [
 *   { ...parseXsd(orderXsd), $filename: 'order.xsd' },
 *   { ...parseXsd(commonXsd), $filename: 'common.xsd' },
 * ];
 * const linked = linkSchemas(schemas);
 * // Each schema now has $imports resolved
 * ```
 */
export function linkSchemas<T extends Schema>(
  schemas: readonly T[],
): (T & { $imports: readonly Schema[] })[] {
  return schemas.map((schema) => resolveImports(schema, schemas));
}
