/**
 * Raw Schema Generator
 *
 * Generates raw schema literals with `as const` for type inference.
 *
 * Output: `export default { ... } as const;`
 */

import type {
  GeneratorPlugin,
  TransformContext,
  GeneratedFile,
} from '../codegen/types';
import { resolveSchema, type ResolveOptions } from '../xsd/resolve';

// ============================================================================
// Options
// ============================================================================

export interface RawSchemaOptions {
  /** Use default export (default: true) */
  defaultExport?: boolean;
  /** Use named export with this name (alternative to default export) */
  namedExport?: string;
  /** Include $xmlns in output (default: true) */
  $xmlns?: boolean;
  /** Include $imports in output for xs:import (default: true) */
  $imports?: boolean;
  /** Include $includes in output for xs:include (default: true) */
  $includes?: boolean;
  /** Include $filename in output (default: false) */
  $filename?: boolean;
  /** Properties to exclude from output */
  exclude?: string[];
  /** Add file header comment */
  header?: boolean;
  /**
   * Resolve schema - merge imports, expand extensions and substitution groups.
   * When enabled, produces a self-contained schema with no $imports dependencies.
   * Can be boolean (true = all options) or ResolveOptions for fine control.
   */
  resolve?: boolean | ResolveOptions;
  /**
   * Resolve includes - merge included schema content directly into the main schema.
   * When enabled, xs:include content is merged recursively and no $includes or include
   * properties appear in the output. The schema becomes self-contained.
   */
  resolveIncludes?: boolean;
  /**
   * Resolve ALL dependencies - merge both $includes AND $imports into a single schema.
   * Creates a fully self-contained schema with all elements and types from the entire
   * dependency tree. Useful for generating a schema that can parse the complete XML
   * document structure (e.g., abapGit root element + asx:abap + values).
   *
   * When enabled, no $includes, $imports, include, or import properties appear in output.
   */
  resolveAll?: boolean;
  /**
   * Generate isolatedDeclarations-compatible output.
   * Uses `satisfies Schema as const` instead of just `as const`.
   * Also adds `import type { Schema } from '@abapify/ts-xsd';`
   */
  isolatedDeclarations?: boolean;
}

// ============================================================================
// Generator
// ============================================================================

/**
 * Create a raw schema generator plugin
 *
 * @example
 * ```ts
 * import { rawSchema } from 'ts-xsd/generators';
 *
 * export default defineConfig({
 *   generators: [
 *     rawSchema(),  // default export
 *     rawSchema({ namedExport: 'mySchema' }),  // named export
 *   ],
 * });
 * ```
 */
export function rawSchema(options: RawSchemaOptions = {}): GeneratorPlugin {
  const {
    defaultExport = true,
    namedExport,
    $xmlns = true,
    $imports = true,
    $includes = true,
    $filename = false,
    exclude = ['annotation'],
    header = true,
    resolveIncludes = false,
    resolveAll = false,
    isolatedDeclarations = false,
  } = options;

  return {
    name: 'raw-schema',

    transform(ctx: TransformContext): GeneratedFile[] {
      const { schema, source } = ctx;

      // Schema is already linked by runner.ts
      // Apply schema resolution if enabled
      let schemaToProcess = schema.schema as Record<string, unknown>;
      if (options.resolve) {
        const resolveOpts: ResolveOptions =
          options.resolve === true ? {} : options.resolve;
        schemaToProcess = resolveSchema(schema.schema, resolveOpts) as Record<
          string,
          unknown
        >;
      }

      // Resolve ALL - merge both $includes AND $imports into a single schema
      // This creates a fully self-contained schema with all elements and types
      if (resolveAll) {
        schemaToProcess = resolveSchema(schema.schema, {
          filterToRootElements: true,
        }) as Record<string, unknown>;
      }
      // Resolve includes only - merge included schema content recursively
      else if (resolveIncludes) {
        schemaToProcess = resolveSchema(schema.schema, {
          resolveImports: false,
          keepImportsRef: true,
        }) as Record<string, unknown>;
      }

      // When resolving all, disable both $includes and $imports in output
      const disableRefs = resolveAll || resolveIncludes;
      const outputSchema = buildOutputSchema(schemaToProcess, {
        $xmlns,
        $imports: resolveAll ? false : $imports,
        $includes: disableRefs ? false : $includes,
        $filename,
        exclude,
        schemaName: schema.name,
        resolveImport: ctx.resolveImport,
      });

      const lines: string[] = [];

      // Header
      if (header) {
        lines.push(
          '/**',
          ' * Auto-generated schema from XSD',
          ' * ',
          ' * DO NOT EDIT - Generated by ts-xsd codegen',
          ` * Source: ${source.name}/${schema.name}.xsd`,
          ' */',
          '',
        );
      }

      // Add Schema type import for isolatedDeclarations mode
      if (isolatedDeclarations) {
        lines.push("import type { Schema } from 'ts-xsd';");
      }

      // Imports for $imports/$includes (skip if resolve/resolveIncludes/resolveAll is enabled - schema is self-contained)
      // Also skip if both $imports and $includes are disabled
      const shouldGenerateImports =
        !options.resolve &&
        !resolveIncludes &&
        !resolveAll &&
        ($imports || $includes);
      if (shouldGenerateImports) {
        const imports = getSchemaImports(schema.schema, ctx.resolveImport, {
          $imports,
          $includes,
        });
        if (imports.length > 0) {
          for (const imp of imports) {
            // For isolatedDeclarations, import the named 'schema' export and alias it
            // This is required because default exports can't be inferred with --isolatedDeclarations
            if (isolatedDeclarations) {
              lines.push(
                `import { schema as ${imp.name} } from '${imp.path}';`,
              );
            } else {
              lines.push(`import ${imp.name} from '${imp.path}';`);
            }
          }
        }
      }

      // Add blank line after imports if any were added
      if (
        isolatedDeclarations ||
        (shouldGenerateImports &&
          getSchemaImports(schema.schema, ctx.resolveImport, {
            $imports,
            $includes,
          }).length > 0)
      ) {
        lines.push('');
      }

      // Schema literal
      const literal = objectToLiteral(outputSchema, true, '  ', 0);

      // For isolatedDeclarations, use named export with `as const satisfies Schema`
      // This is required because default exports can't be inferred with --isolatedDeclarations
      if (isolatedDeclarations) {
        const exportName = namedExport ?? 'schema';
        lines.push(
          `export const ${exportName} = ${literal} as const satisfies Schema;`,
        );
        // Also add default export pointing to the named export
        if (defaultExport && !namedExport) {
          lines.push(`export default ${exportName};`);
        }
      } else if (namedExport) {
        lines.push(`export const ${namedExport} = ${literal} as const;`);
      } else if (defaultExport) {
        lines.push(`export default ${literal} as const;`);
      }

      lines.push('');

      return [
        {
          path: `${schema.name}.ts`,
          content: lines.join('\n'),
        },
      ];
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

interface BuildOptions {
  $xmlns: boolean;
  $imports: boolean;
  $includes: boolean;
  $filename: boolean;
  exclude: string[];
  schemaName: string;
  resolveImport: (schemaLocation: string) => string | null;
}

function buildOutputSchema(
  schema: Record<string, unknown>,
  options: BuildOptions,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const excludeSet = new Set(options.exclude);

  // Add $xmlns first if enabled
  if (options.$xmlns && schema.$xmlns) {
    result.$xmlns = schema.$xmlns;
  }

  // Add $imports if enabled (from xs:import - different namespace)
  if (options.$imports && schema.import) {
    const importRefs: SchemaRef[] = [];
    const imports = schema.import as Array<{ schemaLocation?: string }>;
    for (const imp of imports) {
      if (imp.schemaLocation) {
        const resolved = options.resolveImport(imp.schemaLocation);
        if (!resolved) {
          throw new Error(
            `Cannot resolve xs:import schemaLocation: ${imp.schemaLocation} (in ${options.schemaName}.xsd)`,
          );
        }
        const name = imp.schemaLocation
          .replace(/\.xsd$/, '')
          .replace(/^.*\//, '');
        importRefs.push(new SchemaRef(name));
      }
    }
    if (importRefs.length > 0) {
      result.$imports = importRefs;
    }
  }

  // Add $includes if enabled (from xs:include - same namespace)
  if (options.$includes && schema.include) {
    const includeRefs: SchemaRef[] = [];
    const includes = schema.include as Array<{ schemaLocation?: string }>;
    for (const inc of includes) {
      if (inc.schemaLocation) {
        const resolved = options.resolveImport(inc.schemaLocation);
        if (!resolved) {
          throw new Error(
            `Cannot resolve xs:include schemaLocation: ${inc.schemaLocation} (in ${options.schemaName}.xsd)`,
          );
        }
        // Use base name for valid JS identifier
        const name = inc.schemaLocation
          .replace(/\.xsd$/, '')
          .replace(/^.*\//, '');
        includeRefs.push(new SchemaRef(name));
      }
    }
    if (includeRefs.length > 0) {
      result.$includes = includeRefs;
    }
  }

  // Add $filename if enabled
  if (options.$filename) {
    result.$filename = `${options.schemaName}.xsd`;
  }

  // Copy remaining properties (excluding handled ones)
  for (const [key, value] of Object.entries(schema)) {
    // Skip extension properties
    if (
      key === '$xmlns' ||
      key === '$imports' ||
      key === '$includes' ||
      key === '$filename'
    ) {
      continue;
    }
    // Skip 'import' if $imports is enabled (we output $imports instead)
    if (key === 'import' && options.$imports) {
      continue;
    }
    // Skip 'include' if $includes is enabled (we output $includes instead)
    if (key === 'include' && options.$includes) {
      continue;
    }
    if (!excludeSet.has(key)) {
      result[key] = filterDeep(value, excludeSet);
    }
  }

  return result;
}

function getSchemaImports(
  schema: Record<string, unknown>,
  resolveImport: (schemaLocation: string) => string | null,
  options: { $imports?: boolean; $includes?: boolean } = {
    $imports: true,
    $includes: true,
  },
): Array<{ name: string; path: string }> {
  const imports: Array<{ name: string; path: string }> = [];

  // Handle xs:import (only if $imports is enabled)
  if (options.$imports) {
    const xsdImports = schema.import as
      | Array<{ schemaLocation?: string }>
      | undefined;
    if (xsdImports) {
      for (const imp of xsdImports) {
        if (imp.schemaLocation) {
          const modulePath = resolveImport(imp.schemaLocation);
          if (modulePath) {
            const name = imp.schemaLocation
              .replace(/\.xsd$/, '')
              .replace(/^.*\//, '');
            imports.push({ name, path: modulePath });
          }
        }
      }
    }
  }

  // Handle xs:include (only if $includes is enabled)
  if (options.$includes) {
    const xsdIncludes = schema.include as
      | Array<{ schemaLocation?: string }>
      | undefined;
    if (xsdIncludes) {
      for (const inc of xsdIncludes) {
        if (inc.schemaLocation) {
          const modulePath = resolveImport(inc.schemaLocation);
          if (modulePath) {
            // Use base name for valid JS identifier
            const name = inc.schemaLocation
              .replace(/\.xsd$/, '')
              .replace(/^.*\//, '');
            imports.push({ name, path: modulePath });
          }
        }
      }
    }
  }

  return imports;
}

/** Marker class for schema references in $imports */
class SchemaRef {
  constructor(public readonly name: string) {}
}

function filterDeep(value: unknown, exclude: Set<string>): unknown {
  if (value instanceof SchemaRef) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => filterDeep(item, exclude));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!exclude.has(k)) {
        result[k] = filterDeep(v, exclude);
      }
    }
    return result;
  }

  return value;
}

function objectToLiteral(
  value: unknown,
  pretty: boolean,
  indent: string,
  depth: number,
): string {
  if (value === null || value === undefined) {
    return 'undefined';
  }

  if (value instanceof SchemaRef) {
    return value.name;
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';

    const items = value.map((item) =>
      objectToLiteral(item, pretty, indent, depth + 1),
    );

    if (pretty) {
      const itemIndent = indent.repeat(depth + 1);
      const closeIndent = indent.repeat(depth);
      return `[\n${items
        .map((item) => `${itemIndent}${item}`)
        .join(',\n')},\n${closeIndent}]`;
    }

    return `[${items.join(', ')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);

    if (entries.length === 0) return '{}';

    const props = entries.map(([key, val]) => {
      const keyStr = isValidIdentifier(key) ? key : JSON.stringify(key);
      const valStr = objectToLiteral(val, pretty, indent, depth + 1);
      return `${keyStr}: ${valStr}`;
    });

    if (pretty) {
      const propIndent = indent.repeat(depth + 1);
      const closeIndent = indent.repeat(depth);
      return `{\n${props
        .map((prop) => `${propIndent}${prop}`)
        .join(',\n')},\n${closeIndent}}`;
    }

    return `{ ${props.join(', ')} }`;
  }

  return 'undefined';
}

const RESERVED_WORDS = new Set([
  'break',
  'case',
  'catch',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'finally',
  'for',
  'function',
  'if',
  'in',
  'instanceof',
  'new',
  'return',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'class',
  'const',
  'enum',
  'export',
  'extends',
  'import',
  'super',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'await',
  'null',
  'true',
  'false',
]);

function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str) && !RESERVED_WORDS.has(str);
}
