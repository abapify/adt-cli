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
} from '@abapify/adt-plugin';
import { AdkObjectSet, type AdkContext } from '@abapify/adk';
import type { ExportResult } from '../types';
import { createFileTree } from '../utils/filetree';

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
  description: 'Export local files to SAP (deploy serialized objects)',

  options: [
    {
      flags: '-s, --source <path>',
      description: 'Source directory containing serialized files',
      default: '.',
    },
    {
      flags: '-f, --format <format>',
      description: 'Format plugin: oat | abapgit | @abapify/oat',
      default: 'oat',
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
      flags: '--no-activate',
      description: 'Save inactive (skip activation)',
      default: false,
    },
  ],

  async execute(args: Record<string, unknown>, ctx: CliContext) {
    const options = args as {
      source: string;
      format: string;
      transport?: string;
      package?: string;
      types?: string;
      dryRun?: boolean;
      activate?: boolean;
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

    ctx.logger.info('🚀 Starting export...');
    ctx.logger.info(`📁 Source: ${options.source}`);
    ctx.logger.info(`🎯 Format: ${options.format}`);
    if (options.transport)
      ctx.logger.info(`🚚 Transport: ${options.transport}`);
    if (options.package) ctx.logger.info(`📦 Package: ${options.package}`);
    if (options.dryRun) ctx.logger.info(`🔍 Mode: Dry run (no changes)`);

    // Create FileTree from source path
    const fileTree = createFileTree(options.source);

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

      // Collect objects from plugin generator into AdkObjectSet
      const objectSet = await AdkObjectSet.fromGenerator(
        plugin.format.export(fileTree, client),
        adkContext,
        {
          filter: objectTypes
            ? (obj) => {
                const included = objectTypes.includes(obj.type.toUpperCase());
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

      // ============================================
      // Deploy using AdkObjectSet (save + activate)
      // ============================================
      if (!options.dryRun) {
        ctx.logger.info(`\n🚀 Deploying ${objectSet.size} objects...`);

        // Use AdkObjectSet.deploy() for save inactive + bulk activate
        // Use 'upsert' mode: tries lock first (update existing), falls back to create if not found
        const deployResult = await objectSet.deploy({
          transport: options.transport,
          activate: options.activate !== false,
          mode: 'upsert',
          onProgress: (saved, total, obj) => {
            ctx.logger.info(
              `   💾 [${saved + 1}/${total}] ${obj.kind} ${obj.name}`,
            );
          },
        });

        // Map save results
        result.saved = deployResult.save.success;
        result.failed = deployResult.save.failed;

        for (const r of deployResult.save.results) {
          result.objects.push({
            type: r.object.type,
            name: r.object.name,
            status: r.success ? 'saved' : 'failed',
            error: r.error,
          });
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
