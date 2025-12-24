import { loadFormatPlugin } from '../../utils/format-loader';
import type { ImportContext } from '@abapify/adt-plugin';
import { AdkPackage } from '@abapify/adk';

/**
 * Options for importing a transport request
 */
export interface TransportImportOptions {
  /** Transport request number (e.g., 'DEVK900123') */
  transportNumber: string;
  /** Output directory for serialized files */
  outputPath: string;
  /** Filter by object types (e.g., ['CLAS', 'INTF']) - if not specified, imports all */
  objectTypes?: string[];
  /** Format plugin name or package (e.g., 'oat', '@abapify/oat') */
  format: string;
  /** Enable debug output */
  debug?: boolean;
}

/**
 * Options for importing a package
 */
export interface PackageImportOptions {
  /** Package name (e.g., 'Z_MY_PACKAGE') */
  packageName: string;
  /** Output directory for serialized files */
  outputPath: string;
  /** Filter by object types (e.g., ['CLAS', 'INTF']) - if not specified, imports all */
  objectTypes?: string[];
  /** Include subpackages */
  includeSubpackages?: boolean;
  /** Format plugin name or package (e.g., 'oat', '@abapify/oat') */
  format: string;
  /** Enable debug output */
  debug?: boolean;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** Transport number (for transport imports) */
  transportNumber?: string;
  /** Package name (for package imports) */
  packageName?: string;
  /** Description of the imported content */
  description: string;
  /** Total objects found */
  totalObjects: number;
  /** Statistics */
  results: {
    success: number;
    skipped: number;
    failed: number;
  };
  /** Objects by type */
  objectsByType: Record<string, number>;
  /** Output path */
  outputPath: string;
}

/**
 * Import Service - uses ADK architecture
 * 
 * Flow:
 * 1. Load format plugin (via CLI option or config)
 * 2. Fetch transport via AdkTransport.get() or package via AdkPackage.get()
 * 3. Load each object via objRef.load()
 * 4. Delegate serialization to format plugin
 */
export class ImportService {
  /**
   * Import objects from a transport request
   * 
   * @param options - Import options including transport number, output path, and format
   * @returns Import result with statistics
   */
  async importTransport(options: TransportImportOptions): Promise<ImportResult> {
    if (options.debug) {
      console.log(`🔍 Importing transport: ${options.transportNumber}`);
      console.log(`📁 Output path: ${options.outputPath}`);
      console.log(`🎯 Format: ${options.format}`);
    }

    // Load format plugin
    const plugin = await loadFormatPlugin(options.format);
    
    if (options.debug) {
      console.log(`✅ Loaded plugin: ${plugin.name}`);
    }
    
    // Import AdkTransport dynamically (ADK must be initialized before this)
    const { AdkTransport } = await import('@abapify/adk');
    
    // Fetch transport
    if (options.debug) {
      console.log(`🚛 Fetching transport: ${options.transportNumber}`);
    }
    const transport = await AdkTransport.get(options.transportNumber);
    
    // Filter by object types if specified
    let objectsToImport = transport.objects;
    if (options.objectTypes && options.objectTypes.length > 0) {
      const types = options.objectTypes.map(t => t.toUpperCase());
      objectsToImport = transport.getObjectsByType(...types);
      if (options.debug) {
        console.log(`🔍 Filtered to ${objectsToImport.length} objects by type: ${types.join(', ')}`);
      }
    }
    
    // Track results
    const results = { success: 0, skipped: 0, failed: 0 };
    const objectsByType: Record<string, number> = {};
    
    /**
     * Resolve full package path from root to the given package.
     * Uses ADK to load package → super package → etc until root.
     * 
     * Note: ADK handles per-instance caching. A global package cache
     * could be added to ADK later if performance becomes an issue.
     */
    async function resolvePackagePath(packageName: string): Promise<string[]> {
      const path: string[] = [];
      let currentPackage = packageName;
      
      // Traverse up the package hierarchy
      while (currentPackage) {
        path.unshift(currentPackage); // Add to beginning (building from leaf to root)
        
        try {
          // Load package to get super package
          const pkg = await AdkPackage.get(currentPackage);
          const superPkg = pkg.superPackage;
          
          if (superPkg?.name) {
            currentPackage = superPkg.name;
          } else {
            // No super package - we've reached the root
            break;
          }
        } catch {
          // Package not found or error - stop traversal
          break;
        }
      }
      
      return path;
    }
    
    if (options.debug) {
      console.log(`📦 Processing ${objectsToImport.length} objects...`);
    }
    
    // Process each object
    for (const objRef of objectsToImport) {
      try {
        // Check if plugin supports this object type
        if (!plugin.instance.registry.isSupported(objRef.type)) {
          results.skipped++;
          if (options.debug) {
            console.log(`  ⏭️ ${objRef.type} ${objRef.name}: type not supported`);
          }
          continue;
        }

        // Load the ADK object
        const adkObject = await objRef.load();
        
        if (!adkObject) {
          results.skipped++;
          if (options.debug) {
            console.log(`  ⏭️ ${objRef.type} ${objRef.name}: failed to load`);
          }
          continue;
        }
        
        // Build import context - plugin handles path logic based on its format rules
        // CLI provides a resolver function to get full package hierarchy from SAP
        const context: ImportContext = {
          resolvePackagePath,
        };
        
        // Delegate to plugin - import object from SAP to local files
        const result = await plugin.instance.format.import(
          adkObject as any, // ADK object type
          options.outputPath,
          context
        );
        
        if (result.success) {
          // Track statistics
          objectsByType[objRef.type] = (objectsByType[objRef.type] || 0) + 1;
          results.success++;
          
          if (options.debug) {
            console.log(`  ✅ ${objRef.type} ${objRef.name}`);
          }
        } else {
          results.failed++;
          if (options.debug) {
            console.log(`  ❌ ${objRef.type} ${objRef.name}: ${result.errors?.join(', ') || 'unknown error'}`);
          }
        }
      } catch (error) {
        results.failed++;
        if (options.debug) {
          console.log(`  ❌ ${objRef.type} ${objRef.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    // Call afterImport hook if available
    if (plugin.instance.hooks?.afterImport) {
      await plugin.instance.hooks.afterImport(options.outputPath);
    }
    
    return {
      transportNumber: options.transportNumber,
      description: transport.description,
      totalObjects: objectsToImport.length,
      results,
      objectsByType,
      outputPath: options.outputPath,
    };
  }

  /**
   * Import objects from an ABAP package
   * 
   * @param options - Import options including package name, output path, and format
   * @returns Import result with statistics
   */
  async importPackage(options: PackageImportOptions): Promise<ImportResult> {
    if (options.debug) {
      console.log(`🔍 Importing package: ${options.packageName}`);
      console.log(`📁 Output path: ${options.outputPath}`);
      console.log(`🎯 Format: ${options.format}`);
      console.log(`📦 Include subpackages: ${options.includeSubpackages ?? false}`);
    }

    // Load format plugin
    const plugin = await loadFormatPlugin(options.format);
    
    if (options.debug) {
      console.log(`✅ Loaded plugin: ${plugin.name}`);
    }
    
    // Import AdkPackage dynamically (ADK must be initialized before this)
    const { AdkPackage } = await import('@abapify/adk');
    
    // Fetch package
    if (options.debug) {
      console.log(`📦 Fetching package: ${options.packageName}`);
    }
    const pkg = await AdkPackage.get(options.packageName);
    
    // Get objects from package
    // NOTE: Consider ADK enhancement - getObjects({ recursive: true }) instead of separate methods
    const allObjects = options.includeSubpackages 
      ? await pkg.getAllObjects()  // includes subpackages
      : await pkg.getObjects();    // direct objects only
    
    // Filter by object types if specified
    let objectsToImport = allObjects;
    if (options.objectTypes && options.objectTypes.length > 0) {
      const types = options.objectTypes.map(t => t.toUpperCase());
      objectsToImport = allObjects.filter((obj: { type: string }) => types.includes(obj.type));
      if (options.debug) {
        console.log(`🔍 Filtered to ${objectsToImport.length} objects by type: ${types.join(', ')}`);
      }
    }
    
    // Track results
    const results = { success: 0, skipped: 0, failed: 0 };
    const objectsByType: Record<string, number> = {};
    
    if (options.debug) {
      console.log(`📦 Processing ${objectsToImport.length} objects...`);
    }
    
    // Process each object - AbapObject has type and name
    for (const obj of objectsToImport) {
      try {
        // Delegate to plugin - import object from SAP to local files
        // Note: AbapObject from getObjects() may need to be loaded first
        await plugin.instance.importObject(obj, options.outputPath);
        
        // Track statistics
        objectsByType[obj.type] = (objectsByType[obj.type] || 0) + 1;
        results.success++;
        
        if (options.debug) {
          console.log(`  ✅ ${obj.type} ${obj.name}`);
        }
      } catch (error) {
        results.failed++;
        if (options.debug) {
          console.log(`  ❌ ${obj.type} ${obj.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    return {
      packageName: options.packageName,
      description: pkg.description || `Package ${options.packageName}`,
      totalObjects: objectsToImport.length,
      results,
      objectsByType,
      outputPath: options.outputPath,
    };
  }
}
