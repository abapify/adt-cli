/**
 * Schema Literal Generator
 *
 * Transforms a parsed Schema object into a TypeScript literal string
 * that preserves type information for InferSchema<T>.
 */

import { parseXsd } from '../xsd';
import type { Schema } from '../xsd/types';

export interface GenerateOptions {
  /** Variable name for the exported schema */
  name?: string;
  /** Add JSDoc comment */
  comment?: string;
  /** Pretty print with indentation */
  pretty?: boolean;
  /** Indentation string (default: '  ') */
  indent?: string;
  /**
   * Enable specific $ metadata features in output.
   * - `$xmlns`: Keep `$xmlns` in output (already parsed as $xmlns)
   * - `$imports`: Rename `import` → `$imports` for schema linking
   * - `$filename`: Include `$filename` (uses `name` option + '.xsd')
   *
   * @example
   * ```typescript
   * features: { $xmlns: true, $imports: true, $filename: true }
   * ```
   */
  features?: {
    /** Keep `$xmlns` in output */
    $xmlns?: boolean;
    /** Rename `import` → `$imports` for schema linking */
    $imports?: boolean;
    /** Include `$filename` (uses `name` + '.xsd') */
    $filename?: boolean;
  };
  /**
   * Property names to exclude from output.
   * Useful for removing annotations, documentation, etc.
   *
   * @example
   * ```typescript
   * exclude: ['annotation']  // Remove all annotation elements
   * ```
   */
  exclude?: string[];
  /** Resolver for import paths (schemaLocation -> module path) */
  importResolver?: (schemaLocation: string) => string | null;
  /**
   * Generate isolatedDeclarations-compatible output.
   * Uses `satisfies Schema as const` instead of just `as const`.
   */
  isolatedDeclarations?: boolean;
}

/**
 * Generate a TypeScript literal string from XSD content.
 *
 * @param xsdContent - XSD file content as string
 * @param options - Generation options
 * @returns TypeScript code with schema as const literal
 *
 * @example
 * ```typescript
 * const xsd = `<xs:schema>...</xs:schema>`;
 * const code = generateSchemaLiteral(xsd, { name: 'PersonSchema' });
 * // export const PersonSchema = { ... } as const;
 * ```
 */
export function generateSchemaLiteral(
  xsdContent: string,
  options: GenerateOptions = {},
): string {
  const schema = parseXsd(xsdContent);
  const features = options.features ?? {};
  const exclude = new Set(options.exclude ?? []);

  // Transform schema
  let outputSchema: Record<string, unknown> = { ...schema };

  // Add $filename when enabled (uses name option)
  if (features.$filename && options.name) {
    outputSchema = { $filename: `${options.name}.xsd`, ...outputSchema };
  }

  // Apply transformations (features + exclude)
  outputSchema = applyTransforms(outputSchema, features, exclude);

  return schemaToLiteral(outputSchema as Schema, options);
}

/**
 * Apply transformations: features ($xmlns, $imports) and exclude filter.
 * Used by generateSchemaLiteral (without imports).
 */
function applyTransforms(
  schema: Record<string, unknown>,
  features: NonNullable<GenerateOptions['features']>,
  exclude: Set<string>,
): Record<string, unknown> {
  return applyTransformsWithImports(schema, features, exclude, []);
}

/**
 * Special marker for schema references (not serialized as strings).
 */
class SchemaRef {
  constructor(public readonly name: string) {}
}

/**
 * Apply transformations with schema imports as references.
 */
function applyTransformsWithImports(
  schema: Record<string, unknown>,
  features: NonNullable<GenerateOptions['features']>,
  exclude: Set<string>,
  importedSchemaNames: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip excluded properties
    if (exclude.has(key)) {
      continue;
    }

    if (key === '$xmlns') {
      // $xmlns is already parsed - keep only if feature enabled
      if (features.$xmlns) {
        result[key] = value;
      }
    } else if (key === 'import') {
      // Convert import to $imports with schema references
      if (features.$imports && importedSchemaNames.length > 0) {
        result['$imports'] = importedSchemaNames.map(
          (name) => new SchemaRef(name),
        );
      }
      // If no imports resolved, skip the import property entirely
    } else {
      // Recursively filter nested objects/arrays for exclude
      result[key] = filterDeep(value, exclude);
    }
  }

  return result;
}

/**
 * Recursively filter excluded properties from nested structures.
 */
function filterDeep(value: unknown, exclude: Set<string>): unknown {
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

/**
 * Generate a complete TypeScript file from XSD content.
 *
 * @param xsdContent - XSD file content as string
 * @param options - Generation options
 * @returns Complete TypeScript file content
 */
export function generateSchemaFile(
  xsdContent: string,
  options: GenerateOptions = {},
): string {
  const {
    name = 'schema',
    comment,
    features = {},
    importResolver,
    isolatedDeclarations = false,
  } = options;

  // Parse to extract imports
  const schema = parseXsd(xsdContent);
  const xsdImports = (schema.import ?? []) as Array<{
    schemaLocation?: string;
    namespace?: string;
  }>;

  // Generate TypeScript import statements if $imports feature enabled
  const tsImports: string[] = [];
  const importedSchemaNames: string[] = [];

  // Add Schema type import for isolatedDeclarations mode
  if (isolatedDeclarations) {
    tsImports.push("import type { Schema } from '@abapify/ts-xsd';");
  }

  if (features.$imports && importResolver) {
    for (const imp of xsdImports) {
      if (imp.schemaLocation) {
        const modulePath = importResolver(imp.schemaLocation);
        if (modulePath) {
          // Derive schema name from schemaLocation basename (e.g., "../sap/adtcore.xsd" → "adtcore")
          const schemaName = imp.schemaLocation
            .replace(/\.xsd$/, '')
            .replace(/^.*\//, '');
          tsImports.push(`import ${schemaName} from '${modulePath}';`);
          importedSchemaNames.push(schemaName);
        }
      }
    }
  }

  const lines: string[] = [
    '/**',
    ' * Auto-generated schema literal from XSD',
    ' * ',
    ' * DO NOT EDIT - Generated by ts-xsd codegen',
    comment ? ` * ${comment}` : null,
    ' */',
    '',
    // Add TypeScript imports
    ...tsImports,
    tsImports.length > 0 ? '' : null,
    // Generate schema with $imports as array of schema references
    generateSchemaLiteralWithImports(xsdContent, options, importedSchemaNames),
    '',
    `export type ${pascalCase(name)}Type = typeof ${name};`,
    '',
  ].filter((line): line is string => line !== null);

  return lines.join('\n');
}

/**
 * Generate schema literal with $imports as schema references.
 */
function generateSchemaLiteralWithImports(
  xsdContent: string,
  options: GenerateOptions,
  importedSchemaNames: string[],
): string {
  const schema = parseXsd(xsdContent);
  const features = options.features ?? {};
  const exclude = new Set(options.exclude ?? []);

  // Transform schema
  let outputSchema: Record<string, unknown> = { ...schema };

  // Add $filename when enabled (uses name option)
  if (features.$filename && options.name) {
    outputSchema = { $filename: `${options.name}.xsd`, ...outputSchema };
  }

  // Apply transformations (features + exclude), passing imported schema names
  outputSchema = applyTransformsWithImports(
    outputSchema,
    features,
    exclude,
    importedSchemaNames,
  );

  return schemaToLiteral(outputSchema as Schema, options);
}

/**
 * Escape reserved words by adding underscore suffix.
 */
function escapeReservedWord(name: string): string {
  return RESERVED_WORDS.has(name) ? `${name}_` : name;
}

/**
 * Convert a Schema object to a TypeScript literal string.
 */
function schemaToLiteral(
  schema: Schema,
  options: GenerateOptions = {},
): string {
  const {
    name = 'schema',
    pretty = true,
    indent = '  ',
    isolatedDeclarations = false,
  } = options;

  const safeName = escapeReservedWord(name);
  const literal = objectToLiteral(schema, pretty, indent, 0);

  // For isolatedDeclarations compatibility, use `satisfies Schema as const`
  // This makes the type explicit so TypeScript can emit declarations
  const typeAssertion = isolatedDeclarations
    ? 'satisfies Schema as const'
    : 'as const';

  return `export const ${safeName} = ${literal} ${typeAssertion};`;
}

/**
 * Convert any value to a TypeScript literal string.
 */
function objectToLiteral(
  value: unknown,
  pretty: boolean,
  indent: string,
  depth: number,
): string {
  if (value === null || value === undefined) {
    return 'undefined';
  }

  // Handle SchemaRef - output as bare identifier (not quoted)
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
    if (value.length === 0) {
      return '[]';
    }

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

    if (entries.length === 0) {
      return '{}';
    }

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

/**
 * JavaScript reserved words that cannot be used as variable names.
 */
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

/**
 * Check if a string is a valid JavaScript identifier.
 */
function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str) && !RESERVED_WORDS.has(str);
}

/**
 * Convert string to PascalCase.
 */
function pascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (s) => s.toUpperCase());
}
