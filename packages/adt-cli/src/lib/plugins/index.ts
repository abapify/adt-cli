// Export interfaces (excluding PluginError which conflicts with errors.ts class)
export type {
  AdkObject,
  AbapObjectType,
  SerializedFile,
  DeserializedObject,
  ObjectHandler,
  ObjectHandlerRegistry,
  ExportOptions,
  ImportOptions,
  ExportResult,
  ImportResult,
  PluginContext,
  FormatPlugin,
  SerializationContext,
  SerializeObjectResult,
  SerializeOptions,
  DeserializeOptions,
  SerializeResult,
  PluginConfig,
  ValidationResult,
  PluginSpec,
  IPluginRegistry,
} from './interfaces';

export {
  ADT_TYPE_MAPPINGS,
  getObjectType,
  getKindFromType,
  createHandlerRegistry,
  createFormatPlugin,
} from './interfaces';

// Export errors
export * from './errors';

// Export registry
export { PluginRegistry } from './registry';
