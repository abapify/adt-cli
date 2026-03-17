/**
 * Activate Command Plugin
 *
 * Activates inactive ABAP objects on SAP by file list, package, or transport.
 *
 * Usage:
 *   adt activate zage_fixed_values.doma.xml         (specific files)
 *   adt activate *.doma.xml                          (glob pattern)
 *   adt activate -p ZABAPGIT_EXAMPLES                (all objects in package)
 *   adt activate -t DEVK900001                       (all objects in transport)
 */

import type {
  CliCommandPlugin,
  CliContext,
  AdtPlugin,
  ExportOptions,
} from '@abapify/adt-plugin';
import {
  AdkObjectSet,
  AdkPackage,
  AdkTransport,
  type AdkContext,
  type AdkObject,
  type AdtClient,
  type ActivationResult,
  createAdk,
} from '@abapify/adk';
import {
  createFileTree,
  FilteredFileTree,
  findAbapGitRoot,
  resolveFilesRelativeToRoot,
} from '../utils/filetree';
import { glob as nativeGlob } from 'node:fs/promises';

/**
 * Format shortcuts
 */
const FORMAT_SHORTCUTS: Record<string, string> = {
  abapgit: '@abapify/adt-plugin-abapgit',
  ag: '@abapify/adt-plugin-abapgit',
};

async function loadFormatPlugin(formatSpec: string): Promise<AdtPlugin> {
  const packageName = FORMAT_SHORTCUTS[formatSpec] ?? formatSpec;
  const pluginModule = await import(packageName);
  const PluginClass =
    pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];
  if (!PluginClass) {
    throw new Error(`No plugin class found in ${packageName}`);
  }
  return typeof PluginClass === 'function' && PluginClass.prototype
    ? new PluginClass()
    : PluginClass;
}

/**
 * Expand glob patterns in a list of file arguments.
 * Literal filenames (no glob characters) pass through unchanged.
 */
async function expandGlobs(patterns: string[], cwd: string): Promise<string[]> {
  const results: string[] = [];
  for (const pattern of patterns) {
    if (/[*?[\]{}]/.test(pattern)) {
      for await (const match of nativeGlob(pattern, { cwd })) {
        results.push(match);
      }
    } else {
      results.push(pattern);
    }
  }
  return results;
}

export const activateCommand: CliCommandPlugin = {
  name: 'activate',
  description:
    'Activate inactive ABAP objects (by files, package, or transport)',

  arguments: [
    {
      name: '[files...]',
      description:
        'Specific files or glob patterns (e.g., zage_fixed_values.doma.xml, *.doma.xml)',
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
      flags: '-p, --package <package>',
      description: 'Activate all objects in a package',
    },
    {
      flags: '-t, --transport <request>',
      description: 'Activate all objects in a transport request',
    },
    {
      flags: '--types <types>',
      description: 'Filter by object types (comma-separated)',
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
    };

    if (!ctx.getAdtClient) {
      ctx.logger.error('❌ ADT client not available. Run: adt auth login');
      process.exit(1);
    }

    const client = await ctx.getAdtClient!();
    const adkContext: AdkContext = { client: client as any };

    const objectTypeFilter = options.types
      ? options.types.split(',').map((t) => t.trim().toUpperCase())
      : undefined;

    let objectSet: AdkObjectSet;

    // ── Selector: Transport ──
    if (options.transport) {
      ctx.logger.info(
        `🔄 Activating objects from transport ${options.transport}`,
      );

      const transport = await AdkTransport.get(options.transport, adkContext);
      const objRefs = objectTypeFilter
        ? transport.getObjectsByType(...objectTypeFilter)
        : transport.objects;

      ctx.logger.info(`   📋 Found ${objRefs.length} objects in transport`);

      const adk = createAdk(client as AdtClient);
      objectSet = new AdkObjectSet(adkContext);

      for (const ref of objRefs) {
        try {
          const obj = adk.get(ref.name, ref.type);
          if ('load' in obj && typeof obj.load === 'function') {
            await (obj as AdkObject).load();
            objectSet.add(obj as AdkObject);
            ctx.logger.info(`   📄 ${ref.type} ${ref.name}`);
          }
        } catch (err) {
          ctx.logger.warn(
            `   ⚠️ Skipping ${ref.type} ${ref.name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // ── Selector: Package ──
    } else if (options.package) {
      ctx.logger.info(`🔄 Activating objects in package ${options.package}`);

      const pkg = await AdkPackage.get(options.package);
      const objects = await pkg.getObjects();

      const filtered = objectTypeFilter
        ? objects.filter((o) => objectTypeFilter.includes(o.type.toUpperCase()))
        : objects;

      ctx.logger.info(`   📋 Found ${filtered.length} objects in package`);

      const adk = createAdk(client as AdtClient);
      objectSet = new AdkObjectSet(adkContext);

      for (const obj of filtered) {
        try {
          const adkObj = adk.get(obj.name, obj.type);
          if ('load' in adkObj && typeof adkObj.load === 'function') {
            await (adkObj as AdkObject).load();
            objectSet.add(adkObj as AdkObject);
            ctx.logger.info(`   📄 ${obj.type} ${obj.name}`);
          }
        } catch (err) {
          ctx.logger.warn(
            `   ⚠️ Skipping ${obj.type} ${obj.name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // ── Selector: Files ──
    } else {
      const expandedFiles =
        options.files && options.files.length > 0
          ? await expandGlobs(options.files, ctx.cwd)
          : undefined;
      const specificFiles =
        expandedFiles && expandedFiles.length > 0 ? expandedFiles : undefined;

      if (!specificFiles) {
        ctx.logger.error(
          '❌ Specify files, --package, or --transport to select objects for activation.',
        );
        process.exit(1);
      }

      const repoRoot = findAbapGitRoot(ctx.cwd);
      if (!repoRoot) {
        ctx.logger.error('❌ No .abapgit.xml found in any parent directory.');
        process.exit(1);
      }

      const sourcePath = repoRoot;
      ctx.logger.info('🔄 Activating objects from files');
      ctx.logger.info(`📁 Source: ${sourcePath}`);
      ctx.logger.info(`📄 Files: ${specificFiles.join(', ')}`);

      let fileTree = createFileTree(sourcePath);
      const relFiles = resolveFilesRelativeToRoot(
        specificFiles,
        ctx.cwd,
        sourcePath,
      );
      fileTree = new FilteredFileTree(fileTree, relFiles);

      const plugin = await loadFormatPlugin(options.format);
      if (!plugin.format.export) {
        ctx.logger.error(`❌ Plugin '${plugin.name}' does not support export`);
        process.exit(1);
      }

      const exportOptions: ExportOptions = {
        rootPackage: undefined,
      };

      objectSet = await AdkObjectSet.fromGenerator(
        plugin.format.export(fileTree, client, exportOptions),
        adkContext,
        {
          filter: objectTypeFilter
            ? (obj) => {
                const objType = obj.type.toUpperCase();
                const objPrefix = objType.split('/')[0];
                return (
                  objectTypeFilter.includes(objType) ||
                  objectTypeFilter.includes(objPrefix)
                );
              }
            : undefined,
          onObject: (obj) => {
            ctx.logger.info(`   📄 ${obj.kind} ${obj.name}`);
          },
        },
      );
    }

    // ── Activate ──
    if (objectSet.isEmpty) {
      ctx.logger.warn('⚠️ No objects to activate');
      return;
    }

    ctx.logger.info(`\n⚡ Activating ${objectSet.size} objects...`);

    const result: ActivationResult = await objectSet.activateAll({
      onProgress: (msg) => ctx.logger.info(`   ${msg}`),
    });

    // ── Summary ──
    if (result.success > 0) {
      ctx.logger.info(`✅ ${result.success} objects activated`);
    }
    if (result.failed > 0) {
      ctx.logger.error(`❌ ${result.failed} objects failed activation`);
      for (const msg of result.messages) {
        ctx.logger.error(`   ${msg}`);
      }
      process.exit(1);
    }
  },
};

export default activateCommand;
