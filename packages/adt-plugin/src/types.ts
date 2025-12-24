/**
 * ADT Plugin Types
 *
 * Core types for ADT plugin system.
 */

import type { AdkObject } from '@abapify/adk';

// ============================================
// Basic Types
// ============================================

/**
 * ABAP object type code (e.g., 'CLAS', 'INTF', 'DOMA')
 */
export type AbapObjectType = string;

// ============================================
// Import Types (ADK → File System)
// ============================================

/**
 * Context for import operation
 *
 * The plugin is responsible for determining folder structure based on its format rules.
 * Plugin can use the provided resolver to load package hierarchy from SAP.
 */
export interface ImportContext {
  /**
   * Resolve full package path from root to the given package.
   * Uses ADK to load package → super package → etc until root.
   *
   * @param packageName - Package name to resolve
   * @returns Array of package names from root to current (e.g., ['ZROOT', 'ZROOT_CHILD', 'ZROOT_CHILD_SUB'])
   */
  resolvePackagePath(packageName: string): Promise<string[]>;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean;
  filesCreated: string[];
  errors?: string[];
}

// ============================================
// Export Types (File System → ADK)
// ============================================

/**
 * FileTree - Virtual file system abstraction for export
 *
 * Plugins receive this to iterate and read files without
 * direct dependency on Node.js fs module.
 */
export interface FileTree {
  /** Root path of the file tree */
  readonly root: string;

  /** Find files matching glob pattern */
  glob(pattern: string): Promise<string[]>;

  /** Read file contents as string */
  read(path: string): Promise<string>;

  /** Read file contents as buffer */
  readBuffer(path: string): Promise<Buffer>;

  /** Check if path exists */
  exists(path: string): Promise<boolean>;

  /** List directory contents */
  readdir(path: string): Promise<string[]>;
}

/**
 * Context for export operation (legacy - kept for compatibility)
 */
export interface ExportContext {
  /** Base directory containing the serialized files */
  sourceDir: string;
}

/**
 * Result of single object export operation (legacy)
 */
export interface ExportResult {
  success: boolean;
  object?: AdkObject;
  errors?: string[];
}

// ============================================
// Plugin Interface
// ============================================

/**
 * ADT Plugin interface - service-based structure
 *
 * Plugins provide format-specific serialization/deserialization
 * of ADK objects (e.g., abapGit format, OAT format).
 *
 * @example
 * ```typescript
 * const plugin = createPlugin({
 *   name: 'myFormat',
 *   version: '1.0.0',
 *   description: 'My custom format',
 *
 *   registry: {
 *     isSupported: (type) => ['CLAS', 'INTF'].includes(type),
 *     getSupportedTypes: () => ['CLAS', 'INTF'],
 *   },
 *
 *   format: {
 *     import: async (object, targetPath, context) => {
 *       // Serialize object to files
 *       return { success: true, filesCreated: ['file.xml'] };
 *     },
 *   },
 * });
 * ```
 */
export interface AdtPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  /** Registry service - object type support */
  readonly registry: {
    /**
     * Check if object type is supported by this plugin
     */
    isSupported(type: AbapObjectType): boolean;

    /**
     * Get all supported object types
     */
    getSupportedTypes(): AbapObjectType[];
  };

  /** Format service - import/export operations */
  readonly format: {
    /**
     * Import ADK object to file system (SAP → Git)
     * Converts ADK object to serialized format files
     *
     * @param object - ADK object to serialize
     * @param targetPath - Base output directory
     * @param context - Import context (package path, etc.)
     */
    import(
      object: AdkObject,
      targetPath: string,
      context: ImportContext,
    ): Promise<ImportResult>;

    /**
     * Export from file system to ADK objects (Git → SAP)
     * Generator that yields ADK objects ready to be saved to SAP.
     *
     * Plugin is responsible for:
     * - Iterating files in its format (*.oat.xml, *.abap, etc.)
     * - Parsing each file into ADK object
     * - Yielding ADK objects (does NOT save to SAP)
     *
     * @param fileTree - Virtual file system to read from
     * @param client - ADT client for creating ADK objects
     * @yields ADK objects ready to be saved
     */
    export?(fileTree: FileTree, client: unknown): AsyncGenerator<AdkObject>;
  };

  /** Lifecycle hooks */
  readonly hooks?: {
    /** Called after all objects have been imported */
    afterImport?(targetPath: string): Promise<void>;

    /** Called before export starts */
    beforeExport?(sourcePath: string): Promise<void>;
  };
}

// ============================================
// Plugin Definition (for createPlugin)
// ============================================

/**
 * Plugin definition passed to createPlugin factory
 * Same as AdtPlugin but allows partial hooks
 */
export type AdtPluginDefinition = AdtPlugin;
