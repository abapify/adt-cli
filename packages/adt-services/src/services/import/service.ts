import { loadFormatPlugin, parseFormatSpec } from '../../utils/format-loader';
import { getConfig } from '../../utils/destinations';
import { parseTransportNumbers } from '../../utils/transport-numbers';
import type {
  DeleteResult,
  ImportContext,
  FormatOptionValue,
} from '@abapify/adt-plugin';
import {
  AdkGenericObject,
  AdkPackage,
  AdkTransport,
  MergedTransportView,
  matchesSelector,
  getGlobalContext,
  createAdkFactory,
  resolveClassComponentOwnerName,
} from '@abapify/adk';
import type { AdkTransportObjectRef } from '@abapify/adk';
import { Readable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { selectSearchObject, type SearchObject } from './object-selection';

/** Default number of concurrent SAP requests during import */
const IMPORT_CONCURRENCY = 5;

interface ImportObjectBatch {
  objects: AdkTransportObjectRef[];
  pluginObjectType: string;
  classOwnerName?: string;
  loadRef?: AdkTransportObjectRef;
}

type MissingObjectDelete = (
  objectRef: { pgmid: string; type: string; name: string },
  targetPath: string,
  context: ImportContext,
) => Promise<DeleteResult>;

interface MissingObjectCleanupResult {
  deleted: number;
  skipped: number;
  failed: number;
  filesRemoved: string[];
}

interface MissingObjectCleanupContext {
  batch: ImportObjectBatch;
  fallbackObject: AdkTransportObjectRef;
  deleteFn: MissingObjectDelete;
  outputPath: string;
  importContext: ImportContext;
  firstProgress: number;
  total: number;
  debug?: boolean;
}

function isRepositoryClassOwner(object: AdkTransportObjectRef): boolean {
  return (
    object.pgmid.trim().toUpperCase() === 'R3TR' &&
    object.type.trim().toUpperCase() === 'CLAS'
  );
}

function getClassOwnerName(object: AdkTransportObjectRef): string | undefined {
  if (isRepositoryClassOwner(object)) {
    return object.name.trim().toUpperCase() || undefined;
  }
  return resolveClassComponentOwnerName(object.raw);
}

/** Load and serialize a class once when a transport lists several class leaves. */
function groupImportObjectsByClassOwner(
  objects: AdkTransportObjectRef[],
): ImportObjectBatch[] {
  const batches: ImportObjectBatch[] = [];
  const classBatches = new Map<string, ImportObjectBatch>();

  for (const object of objects) {
    const ownerName = getClassOwnerName(object);
    if (!ownerName) {
      batches.push({ objects: [object], pluginObjectType: object.type });
      continue;
    }

    let batch = classBatches.get(ownerName);
    if (!batch) {
      batch = {
        objects: [],
        pluginObjectType: 'CLAS',
        classOwnerName: ownerName,
      };
      classBatches.set(ownerName, batch);
      batches.push(batch);
    }
    batch.objects.push(object);
    if (!batch.loadRef || isRepositoryClassOwner(object)) {
      batch.loadRef = object;
    }
  }

  return batches;
}

async function cleanupMissingObjectBatch({
  batch,
  fallbackObject,
  deleteFn,
  outputPath,
  importContext,
  firstProgress,
  total,
  debug,
}: MissingObjectCleanupContext): Promise<MissingObjectCleanupResult> {
  // AdkTransportObjectRef.load() maps confirmed HTTP 404 responses to undefined.
  // Transient read errors propagate so ImportService records a failed acquisition.
  const deleteObjects = batch.classOwnerName
    ? [{ pgmid: 'R3TR', type: 'CLAS', name: batch.classOwnerName }]
    : [fallbackObject];
  const representedObjectCount = batch.classOwnerName
    ? batch.objects.length
    : 1;
  const result: MissingObjectCleanupResult = {
    deleted: 0,
    skipped: 0,
    failed: 0,
    filesRemoved: [],
  };

  for (const deleteObject of deleteObjects) {
    const deleteRef = {
      pgmid: deleteObject.pgmid,
      type: deleteObject.type,
      name: deleteObject.name,
    };
    const deleteReason = batch.classOwnerName
      ? 'class owner metadata confirmed not found in SAP'
      : 'not found in SAP';
    console.log(
      `  🗑️  [${firstProgress}/${total}] ${deleteRef.type} ${deleteRef.name}: ${deleteReason}`,
    );
    let delResult: DeleteResult | undefined;
    try {
      delResult = await deleteFn(deleteRef, outputPath, importContext);
    } catch (error: unknown) {
      result.failed += representedObjectCount;
      console.log(`  ❌ ${deleteRef.type} ${deleteRef.name}: cleanup failed`);
      if (debug) {
        console.log(
          `  ⚠️  ${deleteRef.type} ${deleteRef.name}: delete failed — ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      continue;
    }

    result.filesRemoved.push(...(delResult?.filesRemoved ?? []));
    if (!delResult?.success) {
      result.failed += representedObjectCount;
      console.log(`  ❌ ${deleteRef.type} ${deleteRef.name}: cleanup failed`);
      continue;
    }
    if (batch.classOwnerName && delResult.filesRemoved.length === 0) {
      result.skipped += representedObjectCount;
      continue;
    }

    result.deleted += representedObjectCount;
  }

  return result;
}

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
  /** Exact ABAP object type used to disambiguate same-named objects */
  objectType?: string;
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
  /**
   * Transport request number(s).
   *
   * Accepts a single number or a comma-separated list:
   *   - `'DEVK900001'` — single TR
   *   - `'DEVK900001,DEVK900002,DEVK900003'` — multiple TRs (merged, deduplicated)
   */
  transportNumber: string;
  /**
   * Output directory for serialized files. Concurrent imports must use distinct
   * directories; this service does not coordinate writers to a shared directory.
   * Use one comma-separated transportNumber call to combine transports.
   */
  outputPath: string;
  /** Filter by object types (e.g., ['CLAS', 'INTF']) - if not specified, imports all */
  objectTypes?: string[];
  /** Format plugin name or package (e.g., 'abapgit', '@abapify/adt-plugin-abapgit') */
  format: string;
  /** Format-specific options provided via CLI */
  formatOptions?: Record<string, FormatOptionValue>;
  /** Enable debug output */
  debug?: boolean;
  /**
   * Whether to apply deletions for objects marked with obj_func=D and pgmid=R3TR.
   * Default: true
   */
  applyDeletions?: boolean;
  /**
   * When true, write a JSON sidecar for each transport to
   * `<outputPath>/.adt/tr/<TRKORR>.json` with normalized transport metadata.
   * Default: false
   */
  saveTrMetadata?: boolean;
  /**
   * When true, confirmed HTTP 404/not-found objects (`objRef.load()` returns
   * undefined) are eligible for local cleanup via `format.delete()`.
   * Class-component metadata 404s remove the canonical CLAS files once per
   * owner. Other read errors are recorded as failures and never trigger cleanup.
   *
   * This catches the "orphan sync" case where an object was removed in SAP without
   * an explicit `obj_func=D` entry in the transport.
   *
   * Default: false (backward-compatible; previously counted as skipped)
   */
  removeMissingObjects?: boolean;
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
    /** Objects deleted from the file system (obj_func=D) */
    deleted: number;
  };
  /** Objects by type */
  objectsByType: Record<string, number>;
  /** Output path */
  outputPath: string;
  /** Files removed during deletion pass */
  filesRemoved?: string[];
  /** Metadata sidecar files written (when saveTrMetadata is true) */
  metadataFiles?: string[];
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

    // Parse comma-separated transport numbers from positional argument (dedup + uppercase)
    const allTransportNumbers = parseTransportNumbers(options.transportNumber);

    if (options.debug) {
      console.log(
        `🚛 Fetching transport(s): ${allTransportNumbers.join(', ')}`,
      );
    }

    // Resolve transport objects (single or merged)
    let allObjects: AdkTransportObjectRef[];
    let transportDescription: string;
    // Keep individual transport instances for metadata writing
    const loadedTransports: AdkTransport[] = [];

    if (allTransportNumbers.length === 1) {
      const transport = await AdkTransport.get(allTransportNumbers[0]);
      loadedTransports.push(transport);
      allObjects = transport.objects;
      transportDescription = transport.description;
    } else {
      const transports = await Promise.all(
        allTransportNumbers.map((n) => AdkTransport.get(n)),
      );
      loadedTransports.push(...transports);
      const merged = new MergedTransportView(transports);
      allObjects = merged.objects;
      transportDescription =
        transports.find((tr) => tr.description?.trim())?.description ??
        `${allTransportNumbers[0]} (+${allTransportNumbers.length - 1} more)`;
    }

    // Fixed deletion selector: obj_func === 'D' and pgmid === 'R3TR'
    // These are not configurable in v1 (CORR/release-note entries are skipped via pgmid filter)
    const applyDeletions = options.applyDeletions !== false; // default: true
    let deletionObjects: typeof allObjects = [];
    let activeObjects: typeof allObjects = allObjects;

    if (applyDeletions) {
      deletionObjects = [];
      activeObjects = [];

      for (const object of allObjects) {
        if (matchesSelector(object, { objFunc: 'D', pgmid: 'R3TR' })) {
          deletionObjects.push(object);
        } else {
          activeObjects.push(object);
        }
      }
    }

    // Apply object type filter to active objects
    let objectsToImport = activeObjects;
    if (options.objectTypes && options.objectTypes.length > 0) {
      const types = options.objectTypes.map((t) => t.toUpperCase());
      objectsToImport = activeObjects.filter(
        (o) =>
          types.includes(o.type.toUpperCase()) ||
          (getClassOwnerName(o) !== undefined && types.includes('CLAS')),
      );
      if (options.debug) {
        console.log(
          `🔍 Filtered to ${objectsToImport.length} active objects by type: ${types.join(', ')}`,
        );
      }
    }

    // Track results
    const results = { success: 0, skipped: 0, failed: 0, deleted: 0 };
    const objectsByType: Record<string, number> = {};
    const filesRemoved: string[] = [];
    const total = objectsToImport.length;
    let processed = 0;
    const importBatches = groupImportObjectsByClassOwner(objectsToImport);

    // Build the import context once — shared by the active-object pass
    // (line ~380 below), the orphan-sync missing-object deletion path
    // (line ~350 below), and the CTS deletion pass (line ~430 below).
    const importContext: ImportContext = {
      resolvePackagePath,
      formatOptions: options.formatOptions,
      configFormatOptions,
    };

    console.log(`📦 Processing ${total} active objects...`);

    // Process active objects in parallel
    await Readable.from(importBatches).forEach(
      async ({
        objects: batchObjects,
        pluginObjectType,
        classOwnerName,
        loadRef,
      }: ImportObjectBatch) => {
        const firstProgress = processed + 1;
        processed += batchObjects.length;
        const objRef = loadRef ?? batchObjects[0];
        if (!objRef) return;

        try {
          // Check if plugin supports this object type
          if (!plugin.instance.registry.isSupported(pluginObjectType)) {
            results.skipped += batchObjects.length;
            if (options.debug)
              batchObjects.forEach((object, index) =>
                console.log(
                  `  ⏭️ [${firstProgress + index}/${total}] ${object.type} ${object.name}: type not supported`,
                ),
              );
            return;
          }

          batchObjects.forEach((object, index) =>
            console.log(
              `  🔄 [${firstProgress + index}/${total}] ${object.type} ${object.name}`,
            ),
          );

          // Class-component refs share the complete CLAS repository object.
          // Prefer its explicit R3TR ref when present and report each leaf.
          const adkObject = await objRef.load();

          if (!adkObject) {
            const deleteFn = plugin.instance.format.delete;
            if (
              options.removeMissingObjects &&
              typeof deleteFn === 'function'
            ) {
              const cleanup = await cleanupMissingObjectBatch({
                batch: {
                  objects: batchObjects,
                  pluginObjectType,
                  classOwnerName,
                  loadRef,
                },
                fallbackObject: objRef,
                deleteFn,
                outputPath: options.outputPath,
                importContext,
                firstProgress,
                total,
                debug: options.debug,
              });
              results.deleted += cleanup.deleted;
              results.skipped += cleanup.skipped;
              results.failed += cleanup.failed;
              filesRemoved.push(...cleanup.filesRemoved);
            } else {
              results.skipped += batchObjects.length;
              if (options.debug) {
                batchObjects.forEach((object) =>
                  console.log(
                    `  ⏭️ ${object.type} ${object.name}: not found in SAP (skipped)`,
                  ),
                );
              }
            }
            return;
          }

          // An unloaded generic fallback proves neither acquisition nor absence.
          // Count it as failed and never serialize its default-only fields.
          if (adkObject instanceof AdkGenericObject && !adkObject.isLoaded) {
            results.failed += batchObjects.length;
            batchObjects.forEach((object) =>
              console.log(
                `  ❌ ${object.type} ${object.name}: ADK returned an unloaded generic object`,
              ),
            );
            return;
          }

          // Delegate serialization once for the complete object owner.
          const result = await plugin.instance.format.import(
            adkObject as any, // ADK object type
            options.outputPath,
            importContext,
          );

          if (result.success) {
            for (const object of batchObjects) {
              objectsByType[object.type] =
                (objectsByType[object.type] || 0) + 1;
            }
            results.success += batchObjects.length;
          } else {
            results.failed += batchObjects.length;
            batchObjects.forEach((object) =>
              console.log(
                `  ❌ ${object.type} ${object.name}: ${result.errors?.join(', ') || 'unknown error'}`,
              ),
            );
          }
        } catch (error) {
          results.failed += batchObjects.length;
          batchObjects.forEach((object) =>
            console.log(
              `  ❌ ${object.type} ${object.name}: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }
      },
      { concurrency: IMPORT_CONCURRENCY },
    );

    // Deletion pass - remove local files for deleted objects
    if (applyDeletions && deletionObjects.length > 0) {
      console.log(`🗑️  Processing ${deletionObjects.length} deletion(s)...`);

      const deleteSupported =
        typeof plugin.instance.format.delete === 'function';
      if (!deleteSupported && options.debug) {
        console.log(
          `  ⚠️  Plugin '${plugin.name}' does not implement format.delete() — skipping deletion pass`,
        );
      }

      if (deleteSupported) {
        let delProcessed = 0;
        const delTotal = deletionObjects.length;

        await Readable.from(deletionObjects).forEach(
          async (objRef) => {
            const progress = ++delProcessed;
            try {
              console.log(
                `  🗑️  [${progress}/${delTotal}] ${objRef.type} ${objRef.name}`,
              );

              const delResult = await plugin.instance.format.delete!(
                { pgmid: objRef.pgmid, type: objRef.type, name: objRef.name },
                options.outputPath,
                importContext,
              );

              if (delResult.success) {
                results.deleted++;
                filesRemoved.push(...delResult.filesRemoved);
              } else {
                results.failed++;
                console.log(
                  `  ❌ Delete ${objRef.type} ${objRef.name}: ${delResult.errors?.join(', ') || 'unknown error'}`,
                );
              }
            } catch (error) {
              results.failed++;
              console.log(
                `  ❌ Delete ${objRef.type} ${objRef.name}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          },
          { concurrency: IMPORT_CONCURRENCY },
        );
      }
    }

    // Call afterImport hook if available
    if (plugin.instance.hooks?.afterImport) {
      await plugin.instance.hooks.afterImport(options.outputPath);
    }

    // Write transport metadata sidecars if requested
    const metadataFiles: string[] = [];
    if (options.saveTrMetadata) {
      const metadataDir = join(options.outputPath, '.adt', 'tr');
      await mkdir(metadataDir, { recursive: true });

      for (const tr of loadedTransports) {
        const metadata = {
          number: tr.number,
          owner: tr.owner,
          desc: tr.description,
          status: tr.status,
          statusText: tr.statusText,
          target: tr.target,
          tasks: tr.tasks.map((task) => ({
            number: task.number,
            owner: task.owner,
            desc: task.description,
            status: task.status,
            objects: task.objects.map((obj) => ({
              pgmid: obj.pgmid,
              type: obj.type,
              name: obj.name,
              obj_func: obj.objFunc,
              uri: obj.uri,
            })),
          })),
          fetchedAt: new Date().toISOString(),
          import: {
            format: options.format,
            success: results.success,
            skipped: results.skipped,
            failed: results.failed,
            deleted: results.deleted,
          },
        };

        const metadataPath = join(metadataDir, `${tr.number}.json`);
        await writeFile(
          metadataPath,
          JSON.stringify(metadata, null, 2),
          'utf-8',
        );
        metadataFiles.push(metadataPath);
        if (options.debug) {
          console.log(`📄 Wrote transport metadata: ${metadataPath}`);
        }
      }
    }

    return {
      transportNumber: allTransportNumbers[0],
      description: transportDescription,
      totalObjects: allObjects.length,
      results,
      objectsByType,
      outputPath: options.outputPath,
      filesRemoved: filesRemoved.length > 0 ? filesRemoved : undefined,
      metadataFiles: metadataFiles.length > 0 ? metadataFiles : undefined,
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
    const results = { success: 0, skipped: 0, failed: 0, deleted: 0 };
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

    // Step 2: Resolve the exact match. Object names are not globally unique
    // across ABAP object types, so a caller can select the intended type.
    const exactMatch = selectSearchObject(objects, options);

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

    // Step 4: Load the full ADT type via the factory so registered subtypes
    // select their specific endpoint; the format registry uses the base type.
    const factory = createAdkFactory(ctx);
    const adkObject = factory.get(String(exactMatch.name), fullType);
    await (adkObject as any).load();

    // Step 5: Serialize via format plugin
    const context: ImportContext = {
      resolvePackagePath,
      formatOptions: options.formatOptions,
      configFormatOptions,
    };

    const results = { success: 0, skipped: 0, failed: 0, deleted: 0 };
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
