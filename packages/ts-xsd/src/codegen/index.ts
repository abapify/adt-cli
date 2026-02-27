/**
 * XSD Schema Codegen
 *
 * Code generation utilities for XSD schemas.
 *
 * ## Schema Literal Generation
 * - `generateSchemaLiteral` - XSD → TypeScript literal object (for InferSchema<T>)
 * - `generateSchemaFile` - XSD → TypeScript file with schema literal
 *
 * ## Interface Generation
 * - `generateInterfaces` - XSD → TypeScript interfaces
 *
 * ## Config-based Generation (for multi-file projects)
 * See `ts-xsd/generators` for the composable generator system with config files.
 */

// Schema literal generation (XSD → TypeScript literal for InferSchema<T>)
export { generateSchemaLiteral, generateSchemaFile } from './generate';

// Interface generation
export { generateInterfaces, deriveRootTypeName } from './interface-generator';
export type {
  GenerateInterfacesOptions,
  GenerateInterfacesResult,
} from './interface-generator';

// Types - config, hooks, generator plugin interface
export * from './types';

// Runner - codegen engine
export { runCodegen, type RunnerOptions, type RunnerResult } from './runner';
