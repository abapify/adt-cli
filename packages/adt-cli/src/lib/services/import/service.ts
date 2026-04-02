import { loadFormatPlugin, parseFormatSpec } from '../../utils/format-loader';
import { getConfig } from '../../utils/destinations';
import type { ImportContext, FormatOptionValue } from '@abapify/adt-plugin';
import {
  AdkPackage,
  AdkTransport,
  getGlobalContext,
  createAdkFactory,
} from '@abapify/adk';
import { Readable } from 'node:stream';

/** Default number of concurrent SAP requests during import */
const IMPORT_CONCURRENCY = 5;

/**
 * Resolve full package path from root to the given package.
 * Traverses the ADK package hierarchy upward until the root is reached.
 */
async function resolvePackagePath(packageName: string): Promise<string[]> {
  const path: string[] = [];
  let currentPackage = packageName;

  while (currentPackage) {
    path.unshift(currentPackage);
    try {
      const pkg = await AdkPackage.get(currentPackage);
      const superPkg = pkg.superPackage;
      if (superPkg?.name) {
        currentPackage = superPkg.name;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return path;
}

/**
 * Options for importing a single object by name (search-based)
 */
export interface ObjectImportOptions {
  /** Object name to search for (e.g., 'ZAGE_DOMA_CASE_SENSITIVE') */
  objectName: string;
  /** Output directory for serialized files */
  outputPath: string;
  /** Format plugin name or package (e.g., 'abapgit', '@abapify/adt-plugin-abapgit') */
  format: string;
  /** Format-specific options provided via CLI */
  formatOptions?: Record<string, FormatOptionValue>;
  /** Enable debug output */
  debug?: boolean;
}

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
  /** Format plugin name or package (e.g., 'abapgit', '@abapify/adt-plugin-abapgit') */
  format: string;
  /** Format-specific options provided via CLI */
  formatOptions?: Record<string, FormatOptionValue>;
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
  /** Format plugin name or package (e.g., 'abapgit', '@abapify/adt-plugin-abapgit') */
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
  /** Object name (for single-object imports) */
  objectName?: string;
  /** Object type (for single-object imports) */
  objectType?: string;
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
  private async getConfigFormatOptions(
    formatSpec: string,
  ): Promise<Record<string, FormatOptionValue>> {
    const loadedConfig = await getConfig();
    const rawConfig = loadedConfig.raw as Record<string, unknown>;
    const importConfig = rawConfig.import;

    if (
      !importConfig ||
      typeof importConfig !== 'object' ||
      Array.isArray(importConfig)
    ) {
      return {};
    }

    const formatOptionsMap = (importConfig as { formatOptions?: unknown })
      .formatOptions;
    if (
      !formatOptionsMap ||
      typeof formatOptionsMap !== 'object' ||
      Array.isArray(formatOptionsMap)
    ) {
      return {};
    }

    const { package: packageName } = parseFormatSpec(formatSpec);
    const shortName = packageName.replace('@abapify/adt-plugin-', '');
    const pluginName = packageName.replace('@abapify/', '');
    const aliases = [formatSpec, packageName, shortName, pluginName];

    for (const alias of aliases) {
      const value = (formatOptionsMap as Record<string, unknown>)[alias];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, FormatOptionValue>;
      }
    }

    return {};
  }

  /**
   * Import objects from a transport request
   *
   * @param options - Import options including transport number, output path, and format
   * @returns Import result with statistics
   */
  async importTransport(
    options: TransportImportOptions,
  ): Promise<ImportResult> {
    if (options.debug) {
      console.log(`🔍 Importing transport: ${options.transportNumber}`);
      console.log(`📁 Output path: ${options.outputPath}`);
      console.log(`🎯 Format: ${options.format}`);
    }

    // Load format plugin
    const plugin = await loadFormatPlugin(options.format);
    const configFormatOptions = await this.getConfigFormatOptions(
      options.format,
    );

    if (options.debug) {
      console.log(`✅ Loaded plugin: ${plugin.name}`);
    }

    // Fetch transport
    if (options.debug) {
      console.log(`🚛 Fetching transport: ${options.transportNumber}`);
    }
    const transport = await AdkTransport.get(options.transportNumber);

    // Filter by object types if specified
    let objectsToImport = transport.objects;
    if (options.objectTypes && options.objectTypes.length > 0) {
      const types = options.objectTypes.map((t) => t.toUpperCase());
      objectsToImport = transport.getObjectsByType(...types);
      if (options.debug) {
        console.log(
          `🔍 Filtered to ${objectsToImport.length} objects by type: ${types.join(', ')}`,
        );
      }
    }

    // Track results
    const results = { success: 0, skipped: 0, failed: 0 };
    const objectsByType: Record<string, number> = {};
    const total = objectsToImport.length;
    let processed = 0;

    console.log(`📦 Processing ${total} objects...`);

    // Process objects in parallel using Node.js stream concurrency
    await Readable.from(objectsToImport).forEach(
      async (objRef) => {
        const progress = ++processed;
        try {
          // Check if plugin supports this object type
          if (!plugin.instance.registry.isSupported(objRef.type)) {
            results.skipped++;
            if (options.debug) {
              console.log(
                `  ⏭️ [${progress}/${total}] ${objRef.type} ${objRef.name}: type not supported`,
              );
            }
            return;
          }

          console.log(
            `  🔄 [${progress}/${total}] ${objRef.type} ${objRef.name}`,
          );

          // Load the ADK object
          const adkObject = await objRef.load();

          if (!adkObject) {
            results.skipped++;
            if (options.debug) {
              console.log(`  ⏭️ ${objRef.type} ${objRef.name}: failed to load`);
            }
            return;
          }

          // Build import context - plugin handles path logic based on its format rules
          // CLI provides a resolver function to get full package hierarchy from SAP
          const context: ImportContext = {
            resolvePackagePath,
            formatOptions: options.formatOptions,
            configFormatOptions,
          };

          // Delegate to plugin - import object from SAP to local files
          const result = await plugin.instance.format.import(
            adkObject as any, // ADK object type
            options.outputPath,
            context,
          );

          if (result.success) {
            objectsByType[objRef.type] = (objectsByType[objRef.type] || 0) + 1;
            results.success++;
          } else {
            results.failed++;
            console.log(
              `  ❌ ${objRef.type} ${objRef.name}: ${result.errors?.join(', ') || 'unknown error'}`,
            );
          }
        } catch (error) {
          results.failed++;
          console.log(
            `  ❌ ${objRef.type} ${objRef.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
      { concurrency: IMPORT_CONCURRENCY },
    );

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
      console.log(
        `📦 Include subpackages: ${options.includeSubpackages ?? false}`,
      );
    }

    // Load format plugin
    const plugin = await loadFormatPlugin(options.format);
    const configFormatOptions = await this.getConfigFormatOptions(
      options.format,
    );

    if (options.debug) {
      console.log(`✅ Loaded plugin: ${plugin.name}`);
    }

    // Fetch package
    console.log(`🔍 Fetching package: ${options.packageName}`);
    const pkg = await AdkPackage.get(options.packageName);

    // Get objects from package
    let allObjects;
    if (options.includeSubpackages) {
      console.log(`📦 Scanning subpackages…`);
      allObjects = await pkg.getAllObjects();
    } else {
      allObjects = await pkg.getObjects();
    }
    console.log(`📋 Found ${allObjects.length} objects`);

    // Filter by object types if specified
    let objectsToImport = allObjects;
    if (options.objectTypes && options.objectTypes.length > 0) {
      const types = options.objectTypes.map((t) => t.toUpperCase());
      objectsToImport = allObjects.filter(
        (obj: { type: string }) =>
          types.includes(obj.type) || types.includes(obj.type.split('/')[0]),
      );
      if (options.debug) {
        console.log(
          `🔍 Filtered to ${objectsToImport.length} objects by type: ${types.join(', ')}`,
        );
      }
    }

    // Track results
    const results = { success: 0, skipped: 0, failed: 0 };
    const objectsByType: Record<string, number> = {};
    const total = objectsToImport.length;
    let processed = 0;

    // Shared context/factory — created once, safe to reuse across workers
    const ctx = getGlobalContext();
    const factory = createAdkFactory(ctx);

    // Process objects in parallel using Node.js stream concurrency
    await Readable.from(objectsToImport).forEach(
      async (obj) => {
        const progress = ++processed;
        try {
          // Check if plugin supports this object type
          if (!plugin.instance.registry.isSupported(obj.type)) {
            results.skipped++;
            if (options.debug) {
              console.log(
                `  ⏭️ [${progress}/${total}] ${obj.type} ${obj.name}: type not supported`,
              );
            }
            return;
          }

          console.log(`  🔄 [${progress}/${total}] ${obj.type} ${obj.name}`);

          // Load the ADK object using the factory
          const adkObject = factory.get(obj.name, obj.type);
          await (adkObject as any).load();

          if (!adkObject) {
            results.skipped++;
            if (options.debug) {
              console.log(`  ⏭️ ${obj.type} ${obj.name}: failed to load`);
            }
            return;
          }

          // Build import context
          const context: ImportContext = {
            resolvePackagePath,
            configFormatOptions,
          };

          // Delegate to plugin - import object from SAP to local files
          const result = await plugin.instance.format.import(
            adkObject as any,
            options.outputPath,
            context,
          );

          if (result.success) {
            objectsByType[obj.type] = (objectsByType[obj.type] || 0) + 1;
            results.success++;
          } else {
            results.failed++;
            console.log(
              `  ❌ ${obj.type} ${obj.name}: ${result.errors?.join(', ') || 'unknown error'}`,
            );
          }
        } catch (error) {
          results.failed++;
          console.log(
            `  ❌ ${obj.type} ${obj.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
      { concurrency: IMPORT_CONCURRENCY },
    );

    // Call afterImport hook if available
    if (plugin.instance.hooks?.afterImport) {
      await plugin.instance.hooks.afterImport(options.outputPath);
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

  /**
   * Import a single object by name (search-based resolution)
   *
   * Flow:
   * 1. quickSearch for the object name
   * 2. Find exact match — if ambiguous, report all matches
   * 3. Extract ADT type from search result
   * 4. Load via ADK factory + format plugin → local file
   *
   * @param options - Import options including object name, output path, and format
   * @returns Import result with statistics
   */
  async importObject(options: ObjectImportOptions): Promise<ImportResult> {
    if (options.debug) {
      console.log(`🔍 Searching for object: ${options.objectName}`);
      console.log(`📁 Output path: ${options.outputPath}`);
      console.log(`🎯 Format: ${options.format}`);
    }

    // Step 1: Search for the object via quickSearch
    const ctx = getGlobalContext();
    const searchResult =
      await ctx.client.adt.repository.informationsystem.search.quickSearch({
        query: options.objectName,
        maxResults: 10,
      });

    type SearchObject = {
      name?: string;
      type?: string;
      uri?: string;
      description?: string;
      packageName?: string;
    };

    // Handle different response shapes from quickSearch
    const resultsAny = searchResult as Record<string, unknown>;
    if (options.debug) {
      console.log(
        `🔎 Raw search result keys: ${Object.keys(resultsAny).join(', ')}`,
      );
    }
    let rawObjects: SearchObject | SearchObject[] | undefined;
    if ('objectReference' in resultsAny && resultsAny.objectReference) {
      rawObjects = resultsAny.objectReference as SearchObject | SearchObject[];
    } else if (
      'objectReferences' in resultsAny &&
      resultsAny.objectReferences
    ) {
      const refs = resultsAny.objectReferences as {
        objectReference?: SearchObject | SearchObject[];
      };
      rawObjects = refs.objectReference;
    } else if ('mainObject' in resultsAny && resultsAny.mainObject) {
      const main = resultsAny.mainObject as {
        objectReference?: SearchObject | SearchObject[];
      };
      rawObjects = main.objectReference;
    }
    const objects: SearchObject[] = rawObjects
      ? Array.isArray(rawObjects)
        ? rawObjects
        : [rawObjects]
      : [];

    // Step 2: Find exact match (case-insensitive)
    const exactMatch = objects.find(
      (obj: SearchObject) =>
        String(obj.name || '').toUpperCase() ===
        options.objectName.toUpperCase(),
    );

    if (!exactMatch) {
      // Show similar objects as a hint
      const similar = objects
        .filter((obj: SearchObject) =>
          String(obj.name || '')
            .toUpperCase()
            .includes(options.objectName.toUpperCase()),
        )
        .slice(0, 5);

      const hint =
        similar.length > 0
          ? `\n💡 Similar objects:\n${similar.map((o: SearchObject) => `   • ${o.name} (${o.type}) – ${o.packageName}`).join('\n')}`
          : '';

      throw new Error(
        `Object '${options.objectName}' not found in the system.${hint}`,
      );
    }

    // Extract base type (e.g. "DOMA/DD" → "DOMA")
    const fullType = String(exactMatch.type || '');
    const slashIndex = fullType.indexOf('/');
    const baseType =
      slashIndex >= 0 ? fullType.substring(0, slashIndex) : fullType;

    if (options.debug) {
      console.log(
        `✅ Resolved: ${exactMatch.name} (${baseType}) in package ${exactMatch.packageName}`,
      );
    }

    // Step 3: Load format plugin
    const plugin = await loadFormatPlugin(options.format);
    const configFormatOptions = await this.getConfigFormatOptions(
      options.format,
    );

    if (!plugin.instance.registry.isSupported(baseType)) {
      throw new Error(
        `Object type '${baseType}' is not supported by format plugin '${plugin.name}'.`,
      );
    }

    // Step 4: Load ADK object via factory
    const factory = createAdkFactory(ctx);
    const adkObject = factory.get(String(exactMatch.name), baseType);
    await (adkObject as any).load();

    // Step 5: Serialize via format plugin
    const context: ImportContext = {
      resolvePackagePath,
      formatOptions: options.formatOptions,
      configFormatOptions,
    };

    const results = { success: 0, skipped: 0, failed: 0 };
    const objectsByType: Record<string, number> = {};

    const result = await plugin.instance.format.import(
      adkObject as any,
      options.outputPath,
      context,
    );

    if (result.success) {
      objectsByType[baseType] = 1;
      results.success = 1;
      if (options.debug) {
        console.log(`  ✅ ${baseType} ${exactMatch.name}`);
      }
    } else {
      results.failed = 1;
      if (options.debug) {
        console.log(
          `  ❌ ${baseType} ${exactMatch.name}: ${result.errors?.join(', ') || 'unknown error'}`,
        );
      }
    }

    // Call afterImport hook if available
    if (plugin.instance.hooks?.afterImport) {
      await plugin.instance.hooks.afterImport(options.outputPath);
    }

    return {
      objectName: String(exactMatch.name),
      objectType: baseType,
      description:
        String(exactMatch.description || '') ||
        `${baseType} ${exactMatch.name}`,
      totalObjects: 1,
      results,
      objectsByType,
      outputPath: options.outputPath,
    };
  }
}
