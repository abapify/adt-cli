/**
 * Export Command Plugin
 *
 * CLI-agnostic command for exporting local files to SAP.
 * Uses the CliContext for ADT client access.
 */

import type {
  CliCommandPlugin,
  CliContext,
  AdtPlugin,
  ExportOptions,
} from '@abapify/adt-plugin';
import { AdkObjectSet, AdkPackage, type AdkContext } from '@abapify/adk';
import type { ExportResult } from '../types';
import {
  createFileTree,
  FilteredFileTree,
  findAbapGitRoot,
  resolveFilesRelativeToRoot,
} from '../utils/filetree';

/**
 * Format shortcuts - map short names to actual package names
 */
const FORMAT_SHORTCUTS: Record<string, string> = {
  abapgit: '@abapify/adt-plugin-abapgit',
  ag: '@abapify/adt-plugin-abapgit', // alias
};

/**
 * Load format plugin dynamically
 */
async function loadFormatPlugin(formatSpec: string): Promise<AdtPlugin> {
  const packageName = FORMAT_SHORTCUTS[formatSpec] ?? formatSpec;

  try {
    const pluginModule = await import(packageName);
    const PluginClass =
      pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];

    if (!PluginClass) {
      throw new Error(`No plugin class found in ${packageName}`);
    }

    // Check if it's already an instance or needs instantiation
    return typeof PluginClass === 'function' && PluginClass.prototype
      ? new PluginClass()
      : PluginClass;
  } catch (error: unknown) {
    const err = error as Error;
    // Check both error code (CommonJS) and message (ES modules)
    if (
      (err as any).code === 'MODULE_NOT_FOUND' ||
      err.message?.includes(`Cannot find module '${packageName}'`)
    ) {
      throw new Error(
        `Plugin package '${packageName}' not found. Install it with: bun add ${packageName}`,
        { cause: error },
      );
    }
    throw error;
  }
}

/**
 * Display export results in console
 */
function displayExportResults(
  result: ExportResult,
  logger: CliContext['logger'],
): void {
  if (result.discovered === 0) {
    logger.warn('⚠️ No objects found to export');
    return;
  }

  logger.info('\n📊 Export Results:');
  logger.info(`   📦 Discovered: ${result.discovered}`);
  if (result.saved > 0) logger.info(`   💾 Saved: ${result.saved}`);
  if (result.activated > 0) logger.info(`   ✅ Activated: ${result.activated}`);
  if (result.skipped > 0) logger.info(`   ⏭️ Skipped: ${result.skipped}`);
  if (result.failed > 0) logger.error(`   ❌ Failed: ${result.failed}`);

  // Show failed objects
  const failed = result.objects.filter((o) => o.status === 'failed');
  if (failed.length > 0) {
    logger.error('\n❌ Failed objects:');
    for (const obj of failed.slice(0, 5)) {
      logger.error(
        `   ${obj.type} ${obj.name}: ${obj.error || 'unknown error'}`,
      );
    }
    if (failed.length > 5) {
      logger.error(`   ... (${failed.length - 5} more)`);
    }
  }
}

/**
 * Export Command Plugin
 *
 * Exports local serialized files to SAP system.
 *
 * Usage in adt.config.ts:
 * ```typescript
 * export default {
 *   commands: [
 *     '@abapify/adt-export/commands/export',
 *   ],
 * };
 * ```
 */
export const exportCommand: CliCommandPlugin = {
  name: 'export',
  alias: 'deploy',
  description: 'Export local files to SAP (deploy serialized objects)',

  arguments: [
    {
      name: '[files...]',
      description:
        'Specific files to deploy (e.g., zage_fixed_values.doma.xml). Omit to deploy all.',
    },
  ],

  options: [
    {
      flags: '-s, --source <path>',
      description: 'Source directory containing serialized files',
      default: '.',
    },
    {
      flags: '-f, --format <format>',
      description: 'Format plugin: abapgit | @abapify/adt-plugin-abapgit',
      default: 'abapgit',
    },
    {
      flags: '-t, --transport <request>',
      description: 'Transport request for changes',
    },
    {
      flags: '-p, --package <package>',
      description: 'Target package for new objects',
    },
    {
      flags: '--types <types>',
      description: 'Filter by object types (comma-separated, e.g., CLAS,INTF)',
    },
    {
      flags: '--dry-run',
      description: 'Validate without saving to SAP',
      default: false,
    },
    {
      flags: '--activate',
      description: 'Activate objects after deploy (use --no-activate to skip)',
      default: true,
    },
    {
      flags: '--unlock',
      description:
        'Force-unlock objects locked by current user before saving (auto-retry on 403)',
      default: false,
    },
    {
      flags: '--abap-language-version <version>',
      description:
        'ABAP language version for new objects (2=keyUser, 5=cloud). Required for BTP systems.',
    },
  ],

  async execute(args: Record<string, unknown>, ctx: CliContext) {
    const options = args as {
      files?: string[];
      source: string;
      format: string;
      transport?: string;
      package?: string;
      types?: string;
      dryRun?: boolean;
      activate?: boolean;
      unlock?: boolean;
      abapLanguageVersion?: string;
    };

    // Transport is optional:
    // - Objects in $TMP or local packages don't need TR
    // - Objects already locked in a TR will use that TR
    // - SAP will return an error if TR is required but not provided

    // Get ADT client from context
    if (!ctx.getAdtClient) {
      ctx.logger.error(
        '❌ ADT client not available. This command requires authentication.',
      );
      ctx.logger.error('   Run: adt auth login');
      process.exit(1);
    }

    // When specific files are provided, auto-resolve the abapGit repo root
    const specificFiles =
      options.files && options.files.length > 0 ? options.files : undefined;
    let sourcePath = options.source;

    if (specificFiles) {
      const repoRoot = findAbapGitRoot(ctx.cwd);
      if (!repoRoot) {
        ctx.logger.error('❌ No .abapgit.xml found in any parent directory.');
        ctx.logger.error(
          '   Run this command from within an abapGit repository.',
        );
        process.exit(1);
      }
      sourcePath = repoRoot;
    }

    ctx.logger.info('🚀 Starting export...');
    ctx.logger.info(`📁 Source: ${sourcePath}`);
    ctx.logger.info(`🎯 Format: ${options.format}`);
    if (specificFiles) ctx.logger.info(`📄 Files: ${specificFiles.join(', ')}`);
    if (options.transport)
      ctx.logger.info(`🚚 Transport: ${options.transport}`);
    if (options.package) ctx.logger.info(`📦 Package: ${options.package}`);
    if (options.dryRun) ctx.logger.info(`🔍 Mode: Dry run (no changes)`);

    // Create FileTree — wrap with filter when deploying specific files
    let fileTree = createFileTree(sourcePath);
    if (specificFiles) {
      const relFiles = resolveFilesRelativeToRoot(
        specificFiles,
        ctx.cwd,
        sourcePath,
      );
      fileTree = new FilteredFileTree(fileTree, relFiles);
    }

    // Parse object types filter
    const objectTypes = options.types
      ? options.types.split(',').map((t) => t.trim().toUpperCase())
      : undefined;

    const result: ExportResult = {
      discovered: 0,
      saved: 0,
      activated: 0,
      skipped: 0,
      failed: 0,
      objects: [],
    };

    try {
      // Load format plugin
      ctx.logger.info(`📦 Loading format plugin: ${options.format}...`);
      const plugin = await loadFormatPlugin(options.format);

      // Check if plugin supports export
      if (!plugin.format.export) {
        ctx.logger.error(`❌ Plugin '${plugin.name}' does not support export`);
        ctx.logger.info(
          '   The plugin needs to implement format.export(fileTree) generator',
        );
        process.exit(1);
      }

      // Get ADT client and create ADK context
      const client = await ctx.getAdtClient!();
      const adkContext: AdkContext = { client: client as any };

      ctx.logger.info('🔍 Scanning files and building object tree...');

      // Build export options for the format plugin
      const exportOptions: ExportOptions = {
        rootPackage: options.package,
        abapLanguageVersion: options.abapLanguageVersion,
      };

      // Collect objects from plugin generator into AdkObjectSet
      const objectSet = await AdkObjectSet.fromGenerator(
        plugin.format.export(fileTree, client, exportOptions),
        adkContext,
        {
          filter: objectTypes
            ? (obj) => {
                // Match full type (CLAS/OC) or prefix (CLAS)
                const objType = obj.type.toUpperCase();
                const objPrefix = objType.split('/')[0];
                const included =
                  objectTypes.includes(objType) ||
                  objectTypes.includes(objPrefix);
                if (!included) {
                  result.skipped++;
                  result.objects.push({
                    type: obj.type,
                    name: obj.name,
                    status: 'skipped',
                  });
                }
                return included;
              }
            : undefined,
          onObject: (obj) => {
            result.discovered++;
            ctx.logger.info(`   📄 ${obj.kind} ${obj.name}`);
          },
        },
      );

      // Adjust discovered count (filter callback increments for skipped too)
      result.discovered += result.skipped;

      if (objectSet.isEmpty) {
        ctx.logger.warn('⚠️ No objects to export after filtering');
        displayExportResults(result, ctx.logger);
        return;
      }

      // Log package assignments (resolved by format plugin)
      if (options.package) {
        const pkgMap = new Map<string, string[]>();
        for (const obj of objectSet) {
          const pkgName = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (pkgName) {
            if (!pkgMap.has(pkgName)) pkgMap.set(pkgName, []);
            pkgMap.get(pkgName)!.push(obj.name);
          }
        }
        if (pkgMap.size > 0) {
          ctx.logger.info(`� Package resolution: ${options.package}`);
          for (const [pkg, objects] of pkgMap) {
            if (pkg !== options.package) {
              ctx.logger.info(`   📁 ${pkg}: ${objects.join(', ')}`);
            }
          }
        }
      }

      // ============================================
      // Pre-deploy: ensure subpackages exist
      // Collect all unique target packages and create any that
      // don't exist on the SAP system yet.
      // ============================================
      if (options.package && !options.dryRun) {
        // Collect unique subpackage names (exclude root package)
        const subPackages = new Set<string>();
        for (const obj of objectSet) {
          const pkgName = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (pkgName && pkgName !== options.package) {
            subPackages.add(pkgName);
          }
        }

        if (subPackages.size > 0) {
          ctx.logger.info(`\n📦 Checking ${subPackages.size} subpackage(s)...`);

          // Read parent package to inherit software component, transport layer & responsible
          let parentPkg: AdkPackage | undefined;
          try {
            parentPkg = await AdkPackage.get(options.package, adkContext);
          } catch {
            // Parent package read failed — proceed without inherited values
          }

          for (const pkgName of subPackages) {
            const exists = await AdkPackage.exists(pkgName, adkContext);
            if (!exists) {
              ctx.logger.info(`   📦 Creating subpackage ${pkgName}...`);
              try {
                // Build transport config — SAP requires both softwareComponent
                // and transportLayer when transport element is present
                const swComp = parentPkg?.transport?.softwareComponent?.name;
                const trLayer = parentPkg?.transport?.transportLayer?.name;
                const transportConfig =
                  swComp || trLayer
                    ? {
                        softwareComponent: { name: swComp ?? '' },
                        transportLayer: { name: trLayer ?? '' },
                      }
                    : undefined;

                await AdkPackage.create(
                  pkgName,
                  {
                    description: pkgName,
                    responsible: parentPkg?.dataSync?.responsible ?? '',
                    superPackage: { name: options.package },
                    attributes: {
                      packageType: 'development',
                      ...(options.abapLanguageVersion
                        ? {
                            languageVersion: options.abapLanguageVersion as
                              | ''
                              | '2'
                              | '5',
                          }
                        : {}),
                    },
                    ...(transportConfig ? { transport: transportConfig } : {}),
                  },
                  { transport: options.transport },
                  adkContext,
                );
                ctx.logger.info(`   ✅ Created ${pkgName}`);
              } catch (createErr) {
                ctx.logger.warn(
                  `   ⚠️ Failed to create ${pkgName}: ${createErr instanceof Error ? createErr.message : String(createErr)}`,
                );
              }
            }
          }
        }
      }

      // ============================================
      // Pre-deploy: delete objects in wrong package
      // SAP ignores packageRef on PUT (update), so if an object
      // already exists in a different package we must delete it
      // first and let the deploy recreate it in the correct one.
      // ============================================
      if (options.package && !options.dryRun) {
        let deletedForReassign = 0;
        for (const obj of objectSet) {
          const targetPkg = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (!targetPkg) continue;

          try {
            // Save local _data before load() — load() overwrites _data with
            // SAP's current server state, destroying abapGit-sourced fields.
            const localData = (obj as any)._data;

            // Try loading existing object from SAP
            await obj.load();
            const currentPkg = (obj as any).package as string | undefined;

            // Restore the abapGit-sourced data (load was only for package check)
            (obj as any)._data = localData;

            if (!currentPkg || currentPkg === targetPkg) continue;

            // Object exists in wrong package — delete so deploy recreates it
            ctx.logger.info(
              `   📦 ${obj.name}: ${currentPkg} → ${targetPkg} (will delete + recreate)`,
            );

            const contract = (obj as any).crudContract;
            if (contract?.delete) {
              const lockHandle = await obj.lock(options.transport);
              await contract.delete(obj.name, {
                lockHandle: lockHandle.handle,
                corrNr: options.transport,
              });
              // Clear internal state so deploy treats this as a new object
              (obj as any)._data.packageRef = { name: targetPkg };
              (obj as any)._lockHandle = undefined;
              deletedForReassign++;
            }
          } catch (err) {
            // Object doesn't exist yet (404) or load failed — that's fine,
            // the deploy will create it in the correct package
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('404') && !msg.includes('not found')) {
              ctx.logger.warn(`   ⚠️ Pre-deploy check for ${obj.name}: ${msg}`);
            }
          }
        }
        if (deletedForReassign > 0) {
          ctx.logger.info(
            `📦 ${deletedForReassign} object(s) deleted for package reassignment`,
          );
        }
      }

      // ============================================
      // Pre-deploy: force-unlock all objects (--unlock)
      // ============================================
      if (options.unlock && !options.dryRun) {
        ctx.logger.info(
          `\n� --unlock: Force-unlocking all ${objectSet.size} objects...`,
        );
        let unlocked = 0;
        for (const obj of objectSet) {
          try {
            await (client as any).fetch(`${obj.objectUri}?_action=UNLOCK`, {
              method: 'POST',
              headers: { 'X-sap-adt-sessiontype': 'stateful' },
            });
            unlocked++;
          } catch {
            // Object wasn't locked — that's fine, ignore
          }
        }
        if (unlocked > 0) {
          ctx.logger.info(`   🔓 ${unlocked} object(s) unlocked`);
        }
      }

      // ============================================
      // Deploy using AdkObjectSet (save + activate)
      // ============================================
      if (!options.dryRun) {
        ctx.logger.info(`\n� Deploying ${objectSet.size} objects...`);

        // Use AdkObjectSet.deploy() for save inactive + bulk activate
        // Use 'upsert' mode: tries lock first (update existing), falls back to create if not found
        const deployResult = await objectSet.deploy({
          transport: options.transport,
          activate: options.activate,
          mode: 'upsert',
          onProgress: (saved, total, obj) => {
            if (obj._unchanged) {
              ctx.logger.info(
                `   ⏭️ [${saved}/${total}] ${obj.kind} ${obj.name} (unchanged)`,
              );
            } else {
              ctx.logger.info(
                `   💾 [${saved}/${total}] ${obj.kind} ${obj.name}`,
              );
            }
          },
        });

        // Map save results
        result.saved = deployResult.save.success;
        result.failed = deployResult.save.failed;

        for (const r of deployResult.save.results) {
          if (r.unchanged) {
            result.skipped++;
            result.objects.push({
              type: r.object.type,
              name: r.object.name,
              status: 'skipped',
              error: 'unchanged',
            });
          } else {
            result.objects.push({
              type: r.object.type,
              name: r.object.name,
              status: r.success ? 'saved' : 'failed',
              error: r.error,
            });
          }
        }

        // Log unchanged objects
        if (deployResult.save.unchanged > 0) {
          const unchangedNames = deployResult.save.results
            .filter((r) => r.unchanged)
            .map((r) => r.object.name);
          ctx.logger.info(
            `\n⏭️ ${deployResult.save.unchanged} unchanged: ${unchangedNames.join(', ')}`,
          );
        }

        // Map activation results
        if (deployResult.activation) {
          result.activated = deployResult.activation.success;

          if (deployResult.activation.success > 0) {
            ctx.logger.info(
              `\n✅ ${deployResult.activation.success} objects activated`,
            );
          }
          if (deployResult.activation.failed > 0) {
            ctx.logger.warn(
              `⚠️ ${deployResult.activation.failed} objects failed activation`,
            );
            for (const msg of deployResult.activation.messages) {
              ctx.logger.warn(`   ${msg}`);
            }
          }
        }
        // Note: deploy() handles unlockAll() automatically
      } else {
        // Dry run - just mark as would-be-saved
        for (const obj of objectSet) {
          result.objects.push({
            type: obj.type,
            name: obj.name,
            status: 'saved', // Would be saved
          });
        }
        result.saved = objectSet.size;
        ctx.logger.info(
          `\n🔍 Dry run: ${objectSet.size} objects would be saved`,
        );
      }
    } catch (error) {
      ctx.logger.error(
        `❌ Export failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }

    // Display results
    displayExportResults(result, ctx.logger);

    // Exit with error if there were failures
    if (result.failed > 0) {
      process.exit(1);
    }
  },
};

export default exportCommand;
