import type { AdkObject as AdkObjectType, AdkKind } from '@abapify/adk';
import {
  ADT_TYPE_MAPPINGS,
  getKindForType as adkGetKindForType,
  getTypeForKind as adkGetTypeForKind,
} from '@abapify/adk';

// Re-export ADK types for plugin use
export type AdkObject = AdkObjectType;

// ============================================
// Object Type Identification
// ============================================

/**
 * ABAP object type code (e.g., 'CLAS', 'INTF', 'DOMA')
 * This is the SAP technical type used in abapGit
 */
export type AbapObjectType = string;

// Re-export ADK mappings for convenience
export { ADT_TYPE_MAPPINGS };

/**
 * Get object type from ADK object
 */
export function getObjectType(object: AdkObject): AbapObjectType {
  return adkGetTypeForKind(object.kind as AdkKind) ?? object.type;
}

/**
 * Get ADK kind from object type
 */
export function getKindFromType(type: AbapObjectType): AdkKind | undefined {
  return adkGetKindForType(type);
}

// ============================================
// Serialized File Types
// ============================================

/**
 * Result of serializing a single file
 */
export interface SerializedFile {
  /** Relative path from object directory */
  path: string;
  /** File content */
  content: string;
  /** Optional encoding (default: utf-8) */
  encoding?: BufferEncoding;
}

/**
 * Result of deserializing files to an object
 */
export interface DeserializedObject<T = unknown> {
  /** Parsed object data */
  data: T;
  /** Object type */
  type: AbapObjectType;
  /** Object name */
  name: string;
}

// ============================================
// Object Handler Interface
// ============================================

/**
 * Handler for a specific object type
 *
 * Each object type (CLAS, INTF, DOMA, etc.) has its own handler
 * that knows how to serialize/deserialize that type.
 */
export interface ObjectHandler<T extends AdkObject = AdkObject> {
  /** ABAP object type code (e.g., 'CLAS') */
  readonly type: AbapObjectType;

  /** File extension used by this format (e.g., 'clas', 'intf') */
  readonly fileExtension: string;

  /**
   * Serialize ADK object to files
   * @param object - ADK object to serialize
   * @returns Files to write
   */
  serialize(object: T): Promise<SerializedFile[]>;

  /**
   * Deserialize files to object data
   * @param files - Map of filename to content
   * @param objectName - Name of the object
   * @returns Parsed object data
   */
  deserialize?(
    files: Map<string, string>,
    objectName: string,
  ): Promise<DeserializedObject>;
}

/**
 * Object handler registry interface
 */
export interface ObjectHandlerRegistry {
  /**
   * Register a handler for an object type
   */
  register(handler: ObjectHandler): void;

  /**
   * Get handler for an object type
   */
  get(type: AbapObjectType): ObjectHandler | undefined;

  /**
   * Check if a type has a handler
   */
  has(type: AbapObjectType): boolean;

  /**
   * Get all registered types
   */
  getTypes(): AbapObjectType[];

  /**
   * Get all handlers
   */
  getHandlers(): ObjectHandler[];
}

/**
 * Create a new handler registry
 */
export function createHandlerRegistry(): ObjectHandlerRegistry {
  const handlers = new Map<AbapObjectType, ObjectHandler>();

  return {
    register(handler: ObjectHandler): void {
      handlers.set(handler.type, handler);
    },

    get(type: AbapObjectType): ObjectHandler | undefined {
      return handlers.get(type);
    },

    has(type: AbapObjectType): boolean {
      return handlers.has(type);
    },

    getTypes(): AbapObjectType[] {
      return Array.from(handlers.keys());
    },

    getHandlers(): ObjectHandler[] {
      return Array.from(handlers.values());
    },
  };
}

// ============================================
// Import/Export Options
// ============================================

/**
 * Options for export operation (SAP → File System)
 */
export interface ExportOptions {
  /** Target directory */
  targetDir: string;

  /** Overwrite existing files */
  overwrite?: boolean;

  /** Include source code */
  includeSource?: boolean;

  /** Filter object types */
  objectTypes?: AbapObjectType[];
}

/**
 * Options for import operation (File System → SAP)
 */
export interface ImportOptions {
  /** Source directory */
  sourceDir: string;

  /** Transport request for changes */
  transportRequest?: string;

  /** Dry run - don't actually import */
  dryRun?: boolean;

  /** Filter object types */
  objectTypes?: AbapObjectType[];
}

/**
 * Result of export operation
 */
export interface ExportResult {
  success: boolean;
  /** Files created */
  filesCreated: string[];
  /** Objects processed */
  objectsProcessed: number;
  /** Errors encountered */
  errors: Array<{ object: string; message: string }>;
  /** Warnings */
  warnings: string[];
}

/**
 * Result of import operation (file system → SAP)
 */
export interface ImportResult {
  success: boolean;
  /** Objects imported */
  objectsImported: number;
  /** Objects that failed */
  objectsFailed: number;
  /** Errors encountered */
  errors: Array<{ object: string; message: string }>;
  /** Warnings */
  warnings: string[];
}

/**
 * Plugin context for operations
 */
export interface PluginContext {
  /** Root directory for the operation */
  rootDir: string;

  /** Package path from root (e.g., ['ZROOT', 'ZSUB']) */
  packagePath: string[];

  /** Current package name */
  packageName: string;

  /** Logger for plugin output */
  log: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
  };

  /** Progress callback */
  onProgress?(current: number, total: number, message: string): void;
}

// ============================================
// Core Plugin Interface
// ============================================

/**
 * Core plugin interface for format plugins
 *
 * Plugins implement this interface to provide serialization/deserialization
 * for a specific format (abapGit, OAT, etc.).
 *
 * The plugin manages:
 * - Registry of object handlers
 * - File system operations
 * - Format-specific metadata (e.g., .abapgit.xml)
 */
export interface FormatPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  // ============================================
  // Primary API: import/export
  // ============================================

  /**
   * Export objects from SAP to file system
   *
   * This is the main entry point for serialization.
   * It handles:
   * - Iterating over objects
   * - Calling appropriate handlers
   * - Writing files to disk
   * - Creating format-specific metadata
   *
   * @param objects - ADK objects to export
   * @param options - Export options
   * @param context - Plugin context
   */
  export?(
    objects: AdkObject[],
    options: ExportOptions,
    context: PluginContext,
  ): Promise<ExportResult>;

  /**
   * Import objects from file system to SAP
   *
   * This is the main entry point for deserialization.
   * It handles:
   * - Scanning directory structure
   * - Calling appropriate handlers
   * - Creating/updating objects in SAP
   *
   * @param options - Import options
   * @param context - Plugin context
   */
  import?(
    options: ImportOptions,
    context: PluginContext,
  ): Promise<ImportResult>;

  // ============================================
  // Object Handler Registry
  // ============================================

  /**
   * Get handler for a specific object type
   */
  getHandler?(type: AbapObjectType): ObjectHandler | undefined;

  /**
   * Register a custom handler
   */
  registerHandler?(handler: ObjectHandler): void;

  // ============================================
  // Legacy API (backward compatibility)
  // ============================================

  /**
   * Serialize a single ADK object to file system
   * CLI handles iteration and calls this for each object
   *
   * @param object - The ADK object to serialize (Class, Interface, Domain, Package, etc.)
   * @param targetPath - Base output directory
   * @param context - Context about the object's location in the package tree
   */
  serializeObject(
    object: AdkObject,
    targetPath: string,
    context: SerializationContext,
  ): Promise<SerializeObjectResult>;

  /**
   * Legacy: Serialize multiple ADK objects to file system (bulk operation)
   * Used for backward compatibility and batch operations
   */
  serialize?(
    objects: AdkObject[],
    targetPath: string,
    options?: SerializeOptions,
  ): Promise<SerializeResult>;

  /**
   * Deserialize file system to ADK objects (optional - for future use)
   */
  deserialize?(
    sourcePath: string,
    options?: DeserializeOptions,
  ): Promise<AdkObject[]>;

  /**
   * Called before import starts (optional lifecycle hook)
   */
  beforeImport?(targetPath: string): Promise<void>;

  /**
   * Called after import completes (optional lifecycle hook)
   */
  afterImport?(targetPath: string, result?: SerializeResult): Promise<void>;

  /**
   * Validate plugin configuration
   */
  validateConfig?(config: PluginConfig): ValidationResult;

  /**
   * Get supported object types
   */
  getSupportedObjectTypes(): string[];
}

/**
 * Context provided to plugin during serialization
 * Contains information about the object's location in the package hierarchy
 */
export interface SerializationContext {
  /** The package containing this object */
  package: AdkObject; // ADK_Package

  /** Path from root to this package (e.g., ["ZROOT", "ZSUB1", "ZSUB1_A"]) */
  packagePath: string[];

  /** Relative directory path for this package (e.g., "zroot/zsub1/zsub1_a") */
  packageDir: string;

  /** All parent packages (ordered from root to immediate parent) */
  parents: AdkObject[]; // ADK_Package[]

  /** Total objects being processed (for progress tracking) */
  totalObjects: number;

  /** Current object index (for progress tracking) */
  currentIndex: number;
}

/**
 * Result of serializing a single object
 */
export interface SerializeObjectResult {
  success: boolean;
  filesCreated: string[];
  errors?: string[];
}

/**
 * Serialization options
 */
export interface SerializeOptions {
  includeMetadata?: boolean;
  fileStructure?: 'flat' | 'grouped' | 'hierarchical';
  compressionLevel?: number;
  [key: string]: unknown;
}

/**
 * Deserialization options
 */
export interface DeserializeOptions {
  validateStructure?: boolean;
  strictMode?: boolean;
  [key: string]: unknown;
}

/**
 * Serialization result
 */
export interface SerializeResult {
  success: boolean;
  filesCreated: string[];
  objectsProcessed: number;
  errors: PluginError[];
  metadata?: {
    totalSize: number;
    processingTime: number;
    [key: string]: unknown;
  };
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled?: boolean;
  priority?: number;
  options: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Plugin error interface
 */
export interface PluginError {
  message: string;
  plugin: string;
  category: 'config' | 'serialization' | 'validation' | 'filesystem';
  context?: Record<string, unknown>;
  cause?: Error;
}

/**
 * Plugin specification from configuration
 */
export interface PluginSpec {
  name: string;
  version?: string;
  config?: PluginConfig;
}

/**
 * Plugin factory - creates a typed plugin with minimal boilerplate
 *
 * @example
 * export default createFormatPlugin({
 *   name: 'abapGit',
 *   version: '1.0.0',
 *   description: 'abapGit serializer',
 *   getSupportedObjectTypes: () => ['CLAS', 'INTF', 'DOMA', 'DEVC'],
 *   serializeObject: async (object, targetPath, context) => {
 *     // Implementation
 *     return { success: true, filesCreated: [] };
 *   }
 * });
 */
export function createFormatPlugin(plugin: FormatPlugin): FormatPlugin {
  return plugin;
}

/**
 * Plugin registry interface
 */
export interface IPluginRegistry {
  /**
   * Load plugins from configuration
   */
  loadFromConfig(pluginSpecs: PluginSpec[]): Promise<void>;

  /**
   * Get available format plugins
   */
  getAvailableFormats(): string[];

  /**
   * Get specific plugin instance
   */
  getPlugin(formatName: string): FormatPlugin | undefined;

  /**
   * Validate all configured plugins
   */
  validatePlugins(): ValidationResult[];

  /**
   * Register a plugin manually
   */
  register(plugin: FormatPlugin): void;

  /**
   * Unregister a plugin
   */
  unregister(formatName: string): void;
}
