/**
 * XSD Module
 *
 * Parse and build XSD files with typed Schema objects.
 * Supports full roundtrip: XSD → Schema → XSD
 */

// Types - TypeScript representation of XSD documents
export * from './types';

// Schema-like types - Loose constraints for runtime and inference
export * from './schema-like';

// Parser - Parse XSD XML to typed Schema objects
export { parseXsd, default as parse } from './parse';

// Builder - Build XSD XML from typed Schema objects
export { buildXsd, type BuildOptions } from './build';

// Helpers - Schema linking utilities
export { resolveImports, linkSchemas } from './helpers';

// Resolver - Resolve schema with all imports merged
export { resolveSchema, getSubstitutes, type ResolveOptions } from './resolve';

// Loader - Load and parse XSD files from disk
export {
  loadSchema,
  parseSchemaContent,
  createSchemaLoader,
  defaultLoader,
  linkSchema,
  loadAndLinkSchema,
  type XsdLoader,
  type LoaderOptions,
  type LinkOptions,
} from './loader';

// Traverser - OO pattern for schema traversal (uses real W3C types)
export {
  SchemaTraverser,
  SchemaResolver,
  resolveSchemaTypes,
  type NodeSource,
  type TraverseOptions,
  type ResolvedSchema,
} from './traverser';
