/**
 * Schema Loader - Load and parse XSD files from disk
 *
 * Simple loader that reads XSD files and parses them into Schema objects.
 * Resolution of imports/includes is handled by the resolver.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Schema } from './types';
import { parseXsd } from './parse';
import { resolveSchema } from './resolve';

// =============================================================================
// Types
// =============================================================================

/** Function to load XSD content from a schemaLocation path */
export type XsdLoader = (
  schemaLocation: string,
  basePath: string,
) => string | null;

/** Options for schema loading */
export interface LoaderOptions {
  /** Base directory for resolving relative paths */
  basePath?: string;
  /** Custom loader function (default: reads from filesystem) */
  loader?: XsdLoader;
  /**
   * Automatically link schemaLocation references (default: false)
   * Populates $imports/$includes with actual Schema objects.
   * The schema structure is preserved - use this when you need cross-schema type resolution.
   */
  autoLink?: boolean;
  /**
   * Fully resolve the schema after linking (default: false)
   * Flattens all imports/includes into a single self-contained schema.
   * Use this when you need a single schema with all types merged.
   * Implies autoLink: true.
   */
  autoResolve?: boolean;
  /** Throw error if referenced schema cannot be loaded (default: false) */
  throwOnMissing?: boolean;
}

// =============================================================================
// Default Loader
// =============================================================================

/**
 * Default XSD loader - reads from filesystem
 */
export function defaultLoader(
  schemaLocation: string,
  basePath: string,
): string | null {
  const fullPath = resolve(basePath, schemaLocation);
  if (!existsSync(fullPath)) {
    return null;
  }
  return readFileSync(fullPath, 'utf-8');
}

// =============================================================================
// Schema Loader Functions
// =============================================================================

/**
 * Load and parse a single XSD file.
 *
 * @param schemaPath - Path to the XSD file
 * @param options - Loader options
 * @param options.autoLink - Populate $imports/$includes with loaded schemas (preserves structure)
 * @param options.autoResolve - Flatten into single schema with all types merged (implies autoLink)
 * @returns Parsed schema
 *
 * @example
 * ```typescript
 * // Just parse - no linking
 * const schema = loadSchema('/path/to/schema.xsd');
 *
 * // Link - populate $imports/$includes (preserves multi-schema structure)
 * const linked = loadSchema('/path/to/schema.xsd', { autoLink: true });
 * // linked.$imports contains actual Schema objects
 *
 * // Resolve - flatten everything into one schema
 * const resolved = loadSchema('/path/to/schema.xsd', { autoResolve: true });
 * // resolved has all types merged, no $imports/$includes
 * ```
 */
export function loadSchema(
  schemaPath: string,
  options: LoaderOptions = {},
): Schema {
  const {
    basePath = dirname(schemaPath),
    loader = defaultLoader,
    autoLink = false,
    autoResolve = false,
    throwOnMissing = false,
  } = options;

  const content = loader(schemaPath, basePath);
  if (!content) {
    throw new Error(`Failed to load schema: ${schemaPath}`);
  }

  let schema = parseXsd(content);
  // Set $filename for reference
  Object.assign(schema, { $filename: schemaPath });

  // Auto-link if requested (or if autoResolve is set)
  if (autoLink || autoResolve) {
    linkSchema(schema, { basePath, loader, throwOnMissing });
  }

  // Auto-resolve if requested - flatten into single schema
  if (autoResolve) {
    schema = resolveSchema(schema);
  }

  return schema;
}

/**
 * Load and parse XSD content from a string.
 */
export function parseSchemaContent(content: string, filename?: string): Schema {
  const schema = parseXsd(content);
  if (filename) {
    Object.assign(schema, { $filename: filename });
  }
  return schema;
}

/**
 * Create a schema loader function that can be passed to the resolver.
 * The resolver will call this to load schemas referenced by schemaLocation.
 */
export function createSchemaLoader(
  basePath: string,
  loader: XsdLoader = defaultLoader,
): (schemaLocation: string) => Schema | null {
  const cache = new Map<string, Schema>();

  return (schemaLocation: string): Schema | null => {
    const fullPath = resolve(basePath, schemaLocation);

    // Check cache
    const cached = cache.get(fullPath);
    if (cached) {
      return cached;
    }

    // Load and parse
    const content = loader(schemaLocation, basePath);
    if (!content) {
      return null;
    }

    const schema = parseXsd(content);
    Object.assign(schema, { $filename: schemaLocation });
    cache.set(fullPath, schema);

    return schema;
  };
}

// =============================================================================
// Schema Linking - Resolve schemaLocation references
// =============================================================================

/** Options for schema linking */
export interface LinkOptions {
  /** Base directory for resolving relative schemaLocation paths */
  basePath: string;
  /** Custom loader function (default: reads from filesystem) */
  loader?: XsdLoader;
  /** Whether to throw on missing schemas (default: false - skip missing) */
  throwOnMissing?: boolean;
}

/**
 * Link a schema by resolving all schemaLocation references.
 *
 * Processes:
 * - xs:import → populates $imports
 * - xs:include → populates $includes
 * - xs:redefine → loads base schema, keeps redefinitions in redefine array
 * - xs:override → loads base schema, keeps overrides in override array
 *
 * @param schema - Schema to link (will be mutated with $imports/$includes)
 * @param options - Link options including basePath for resolving paths
 * @returns The same schema with $imports and $includes populated
 *
 * @example
 * ```typescript
 * const schema = parseXsd(xsdContent);
 * linkSchema(schema, { basePath: '/path/to/xsd/files' });
 * // schema.$imports and schema.$includes are now populated
 * ```
 */
export function linkSchema(schema: Schema, options: LinkOptions): Schema {
  const { basePath, loader = defaultLoader, throwOnMissing = true } = options;

  // Cache to prevent infinite loops and duplicate loading
  const cache = new Map<string, Schema>();
  const inProgress = new Set<string>();

  // Helper to load and link a schema by schemaLocation
  const loadAndLink = (
    schemaLocation: string,
    currentBasePath: string,
  ): Schema | null => {
    const fullPath = resolve(currentBasePath, schemaLocation);

    // Check cache first
    const cached = cache.get(fullPath);
    if (cached) return cached;

    // Detect circular references
    if (inProgress.has(fullPath)) {
      return cache.get(fullPath) ?? null;
    }

    // Load the schema
    const content = loader(schemaLocation, currentBasePath);
    if (!content) {
      if (throwOnMissing) {
        throw new Error(
          `Failed to load schema: ${schemaLocation} (resolved: ${fullPath})`,
        );
      }
      return null;
    }

    // Parse and mark as in progress
    const loadedSchema = parseXsd(content);
    Object.assign(loadedSchema, { $filename: schemaLocation });
    inProgress.add(fullPath);
    cache.set(fullPath, loadedSchema);

    // Recursively link the loaded schema
    const newBasePath = dirname(fullPath);
    linkSchemaInternal(loadedSchema, newBasePath, loadAndLink);

    inProgress.delete(fullPath);
    return loadedSchema;
  };

  // Internal linking function
  linkSchemaInternal(schema, basePath, loadAndLink);

  return schema;
}

// =============================================================================
// Internal linking helpers
// =============================================================================

/** Function to load and link a schema by schemaLocation */
type LoadAndLink = (
  schemaLocation: string,
  currentBasePath: string,
) => Schema | null;

/** A schema reference with a resolvable schemaLocation */
interface SchemaLocationRef {
  readonly schemaLocation?: string;
}

/** Process imports/includes/redefines/overrides and link their schemas. */
function linkSchemaInternal(
  s: Schema,
  currentBasePath: string,
  loadAndLink: LoadAndLink,
): void {
  // Process xs:import elements
  const imports = loadLinkedSchemas(s.import, currentBasePath, loadAndLink);

  // Process xs:include elements
  const includes = loadLinkedSchemas(s.include, currentBasePath, loadAndLink);

  // Process xs:redefine elements - load base schema and attach to redefine.$schema
  attachBaseSchemas(s.redefine, currentBasePath, loadAndLink);

  // Process xs:override elements - load base schema and attach to override.$schema
  attachBaseSchemas(s.override, currentBasePath, loadAndLink);

  // Set $imports and $includes
  if (imports.length > 0) {
    Object.assign(s, { $imports: imports });
  }
  if (includes.length > 0) {
    Object.assign(s, { $includes: includes });
  }
}

/** Load and link every referenced schema, skipping missing ones. */
function loadLinkedSchemas(
  refs: readonly SchemaLocationRef[] | undefined,
  currentBasePath: string,
  loadAndLink: LoadAndLink,
): Schema[] {
  const linkedSchemas: Schema[] = [];
  for (const ref of refs ?? []) {
    if (ref.schemaLocation) {
      const linked = loadAndLink(ref.schemaLocation, currentBasePath);
      if (linked) {
        linkedSchemas.push(linked);
      }
    }
  }
  return linkedSchemas;
}

/**
 * Load the base schema of each redefine/override element
 * and attach it to the element as `$schema`.
 */
function attachBaseSchemas(
  refs: readonly SchemaLocationRef[] | undefined,
  currentBasePath: string,
  loadAndLink: LoadAndLink,
): void {
  for (const ref of refs ?? []) {
    if (ref.schemaLocation) {
      const linked = loadAndLink(ref.schemaLocation, currentBasePath);
      if (linked) {
        // Attach base schema directly to redefine/override element
        Object.assign(ref, { $schema: linked });
      }
    }
  }
}

/**
 * Load and link a schema from a file path.
 * Convenience function that combines loadSchema + linkSchema.
 *
 * @param schemaPath - Path to the XSD file
 * @param options - Optional loader options
 * @returns Fully linked schema with $imports and $includes populated
 *
 * @example
 * ```typescript
 * const schema = loadAndLinkSchema('/path/to/schema.xsd');
 * // schema.$imports and schema.$includes are populated
 * // Ready for type inference or resolution
 * ```
 */
export function loadAndLinkSchema(
  schemaPath: string,
  options: Omit<LoaderOptions, 'basePath'> = {},
): Schema {
  const basePath = dirname(schemaPath);
  const schema = loadSchema(schemaPath, { ...options, basePath });
  return linkSchema(schema, { basePath, loader: options.loader });
}
