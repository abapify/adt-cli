/**
 * Generator Plugin Types
 *
 * Composable generator architecture for ts-xsd codegen.
 * Each generator is a plugin that can transform schemas and produce output files.
 */

import type { Schema } from '../xsd/types';

// ============================================================================
// Generated Output
// ============================================================================

/**
 * A file to be written by the codegen system
 */
export interface GeneratedFile {
  /** Relative path from outputDir (e.g., 'intf.ts', 'index.ts') */
  path: string;
  /** File content */
  content: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Information about a single schema being processed
 */
export interface SchemaInfo {
  /** Schema name (e.g., 'intf', 'classes') */
  name: string;
  /** Parsed XSD content */
  xsdContent: string;
  /** Parsed schema object */
  schema: Schema;
  /** Source group name (e.g., 'sap', 'custom', 'abapgit') */
  sourceName: string;
  /** XSD file path */
  xsdPath: string;
}

/**
 * Information about a source group
 */
export interface SourceInfo {
  /** Source name (e.g., 'sap', 'custom') */
  name: string;
  /** Directory containing XSD files */
  xsdDir: string;
  /** Output directory for generated files */
  outputDir: string;
  /** List of schema names to process */
  schemas: string[];
}

/**
 * Context passed to setup() - before any schemas are processed
 */
export interface SetupContext {
  /** All configured sources */
  sources: Record<string, SourceInfo>;
  /** Root directory (where config file is located) */
  rootDir: string;
}

/**
 * Context passed to transform() - for each schema
 */
export interface TransformContext {
  /** Current schema being processed */
  schema: SchemaInfo;
  /** Source this schema belongs to */
  source: SourceInfo;
  /** All schemas in this source (for import resolution) */
  allSchemas: Map<string, SchemaInfo>;
  /** All sources (for cross-source import resolution) */
  allSources: Record<string, SourceInfo>;
  /** Root directory */
  rootDir: string;
  /** Resolve import path for a schema location */
  resolveImport: (schemaLocation: string) => string | null;
}

/**
 * Context passed to finalize() - after all schemas are processed
 */
export interface FinalizeContext {
  /** All processed schemas grouped by source */
  processedSchemas: Map<string, SchemaInfo[]>;
  /** All sources */
  sources: Record<string, SourceInfo>;
  /** Root directory */
  rootDir: string;
}

// ============================================================================
// Generator Plugin Interface
// ============================================================================

/**
 * Generator plugin interface
 *
 * Generators are composable - multiple generators can be used together.
 * Each generator can:
 * - setup(): Initialize state before processing
 * - transform(): Generate files for each schema
 * - finalize(): Generate aggregate files after all schemas
 */
export interface GeneratorPlugin {
  /** Unique name for this generator */
  readonly name: string;

  /**
   * Called once before processing any schemas.
   * Use for initialization, validation, etc.
   */
  setup?(ctx: SetupContext): void | Promise<void>;

  /**
   * Called for each schema file.
   * Return generated files for this schema.
   */
  transform?(ctx: TransformContext): GeneratedFile[] | Promise<GeneratedFile[]>;

  /**
   * Called once after all schemas are processed.
   * Use for generating index files, aggregate types, etc.
   */
  finalize?(ctx: FinalizeContext): GeneratedFile[] | Promise<GeneratedFile[]>;
}

// ============================================================================
// Config Types
// ============================================================================

/**
 * Source configuration
 */
export interface SourceConfig {
  /** Directory containing XSD files (relative to config file) */
  xsdDir: string;
  /** Output directory for generated files (relative to config file) */
  outputDir: string;
  /** List of schema names to process (without .xsd extension) */
  schemas: string[];
  /**
   * Automatically discover and include all dependent schemas referenced via
   * xs:import, xs:include, xs:redefine schemaLocation attributes.
   * When enabled, you only need to list entry-point schemas - all dependencies
   * will be discovered and generated automatically.
   */
  autoLink?: boolean;
}

/**
 * Hook context for beforeAll/afterAll
 */
export interface HookContext {
  /** All configured sources */
  sources: Record<string, SourceInfo>;
  /** Root directory (where config file is located) */
  rootDir: string;
}

/**
 * Hook context for afterAll with results
 */
export interface AfterAllContext extends HookContext {
  /** All processed schemas grouped by source */
  processedSchemas: Map<string, SchemaInfo[]>;
  /** All generated files */
  generatedFiles: GeneratedFile[];
}

/**
 * Codegen configuration
 */
export interface CodegenConfig {
  /** Schema sources to process */
  sources: Record<string, SourceConfig>;
  /** Generator plugins to run */
  generators: GeneratorPlugin[];
  /** Import extension for generated files: '.ts' for Node.js native, '' for bundlers (default: '' for bundler compatibility) */
  importExtension?: '.ts' | '';
  /** Clean output directories before generation (default: false) */
  clean?: boolean;
  /** Features to enable for all generators */
  features?: {
    /** Include $xmlns in output */
    $xmlns?: boolean;
    /** Include $imports in output */
    $imports?: boolean;
    /** Include $filename in output */
    $filename?: boolean;
  };
  /** Properties to exclude from output */
  exclude?: string[];

  /**
   * Hook called before any processing starts.
   * Use for setup, validation, cleaning output dirs, etc.
   */
  beforeAll?(ctx: HookContext): void | Promise<void>;

  /**
   * Hook called after all processing is complete.
   * Use for generating aggregate files, post-processing, etc.
   * Return additional files to write.
   */
  afterAll?(
    ctx: AfterAllContext,
  ): GeneratedFile[] | void | Promise<GeneratedFile[] | void>;
}

/**
 * Define a codegen configuration with type checking
 */
export function defineConfig(config: CodegenConfig): CodegenConfig {
  return config;
}
