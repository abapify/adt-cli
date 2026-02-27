/**
 * Interface Generator - High-level API for generating TypeScript interfaces from XSD schemas
 *
 * Consumes ts-morph.ts for SourceFile manipulation, handles:
 * - generateInterfaces API with flatten option
 * - Code string output
 * - Root type name derivation
 */

import type { SourceFile, Project } from 'ts-morph';
import type { Schema } from '../xsd/types';
import {
  schemaToSourceFile,
  flattenType,
  type SchemaToSourceFileOptions,
} from './ts-morph';

// =============================================================================
// Types
// =============================================================================

export interface GenerateInterfacesOptions extends SchemaToSourceFileOptions {
  /**
   * If true, generates a single flattened type with all nested types inlined.
   * If false (default), generates interfaces with imports and extends.
   */
  flatten?: boolean;
  /**
   * Additional source files to include for resolving imports when flattening.
   * These are typically the generated source files from $imports schemas.
   */
  additionalSourceFiles?: SourceFile[];
}

export interface GenerateInterfacesResult {
  /** The generated TypeScript code */
  code: string;
  /** The ts-morph SourceFile */
  sourceFile: SourceFile;
  /** The root type name */
  rootTypeName: string | undefined;
  /** The ts-morph Project (useful for further manipulation) */
  project: Project;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Derive root type name from schema filename.
 * e.g., 'packagesV1.xsd' -> 'PackagesV1Schema'
 */
export function deriveRootTypeName(filename?: string): string | undefined {
  if (!filename) return undefined;
  const baseName = filename.replace(/\.xsd$/, '').replace(/^.*\//, '');
  const pascalCase = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  return `${pascalCase}Schema`;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Generate TypeScript interfaces from a schema.
 *
 * @param schema - The schema to generate interfaces from
 * @param options - Generation options
 * @returns Generated TypeScript code and metadata
 *
 * @example
 * // Generate interfaces with imports and extends
 * const { code } = generateInterfaces(schema);
 *
 * @example
 * // Generate a single flattened type with all nested types inlined
 * const { code } = generateInterfaces(schema, {
 *   flatten: true,
 *   additionalSourceFiles: [baseSchemaSourceFile]
 * });
 */
export function generateInterfaces(
  schema: Schema,
  options: GenerateInterfacesOptions = {},
): GenerateInterfacesResult {
  const { flatten, additionalSourceFiles, ...schemaOptions } = options;

  // Step 1: Generate the source file with interfaces using ts-morph
  const { project, sourceFile, rootTypeName } = schemaToSourceFile(
    schema,
    schemaOptions,
  );

  // Step 2: If flatten is requested and we have a root type, flatten it
  if (flatten && rootTypeName) {
    const flattenedFile = flattenType(sourceFile, rootTypeName, {
      additionalSourceFiles,
      filename: `${
        schema.$filename?.replace('.xsd', '') ?? 'schema'
      }.flattened.ts`,
    });

    return {
      code: flattenedFile.getFullText(),
      sourceFile: flattenedFile,
      rootTypeName,
      project,
    };
  }

  // Return the non-flattened interfaces
  return {
    code: sourceFile.getFullText(),
    sourceFile,
    rootTypeName,
    project,
  };
}
