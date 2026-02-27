/**
 * ts-xsd Generators
 *
 * Composable generator plugins for XSD codegen.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'ts-xsd/generators';
 * import { rawSchema, inferredTypes, indexBarrel } from 'ts-xsd/generators';
 *
 * export default defineConfig({
 *   sources: {
 *     abapgit: {
 *       xsdDir: 'xsd',
 *       outputDir: 'src/schemas/generated',
 *       schemas: ['intf', 'dtel', 'clas'],
 *     },
 *   },
 *   generators: [
 *     rawSchema(),
 *     inferredTypes(),
 *     indexBarrel(),
 *   ],
 * });
 * ```
 */

// Types - re-exported from codegen
export type {
  GeneratorPlugin,
  GeneratedFile,
  SchemaInfo,
  SourceInfo,
  SourceConfig,
  SetupContext,
  TransformContext,
  FinalizeContext,
  HookContext,
  AfterAllContext,
  CodegenConfig,
} from '../codegen/types';

// Config helper - re-exported from codegen
export { defineConfig } from '../codegen/types';

// Generator plugins - each exports a factory function
export { rawSchema, type RawSchemaOptions } from './raw-schema';
export { inferredTypes, type InferredTypesOptions } from './inferred-types';
export { interfaces, type InterfacesOptions } from './interfaces';
export { indexBarrel, type IndexBarrelOptions } from './index-barrel';
export { typedSchemas, type TypedSchemasOptions } from './typed-schemas';

// Runner - re-exported from codegen
export {
  runCodegen,
  type RunnerOptions,
  type RunnerResult,
} from '../codegen/runner';
