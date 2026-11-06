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
import { loadFormatPlugin } from '../utils/format-plugin';
import { glob as nativeGlob } from 'node:fs/promises';

/**
 * Expand glob patterns in a list of file arguments.
 * Literal filenames (no glob characters) pass through unchanged.
 */
async function expandGlobs(patterns: string[], cwd: string): Promise<string[]> {
  const perPattern = await Promise.all(
    patterns.map(async (pattern) => {
      const matches: string[] = [];
      if (/[*?[\]{}]/.test(pattern)) {
        for await (const match of nativeGlob(pattern, { cwd })) {
          matches.push(match);
        }
      } else {
        matches.push(pattern);
      }
      return matches;
    }),
  );
  return perPattern.flat();
}

/** CLI options parsed for the `activate` command. */
interface ActivateCliOptions {
  files?: string[];
  source: string;
  format: string;
  transport?: string;
  package?: string;
  types?: string;
}

/** The ADT client as handed over by the CLI context. */
type ContextClient = Awaited<
  ReturnType<NonNullable<CliContext['getAdtClient']>>
>;

/** Load one transport object into `objectSet`, logging and skipping failures. */
async function loadObjectIntoSet(
  adk: ReturnType<typeof createAdk>,
  objectSet: AdkObjectSet,
  name: string,
  type: string,
  ctx: CliContext,
): Promise<void> {
  try {
    const obj = adk.get(name, type);
    if ('load' in obj && typeof obj.load === 'function') {
      await (obj as AdkObject).load();
      objectSet.add(obj as AdkObject);
      ctx.logger.info(`   📄 ${type} ${name}`);
    }
  } catch (err) {
    ctx.logger.warn(
      `   ⚠️ Skipping ${type} ${name}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Selector: Transport — load every transport object into a new set. */
async function objectSetFromTransport(
  transportId: string,
  objectTypeFilter: string[] | undefined,
  adk: ReturnType<typeof createAdk>,
  adkContext: AdkContext,
  ctx: CliContext,
): Promise<AdkObjectSet> {
  ctx.logger.info(`🔄 Activating objects from transport ${transportId}`);

  const transport = await AdkTransport.get(transportId, adkContext);
  const objRefs = objectTypeFilter
    ? transport.getObjectsByType(...objectTypeFilter)
    : transport.objects;

  ctx.logger.info(`   📋 Found ${objRefs.length} objects in transport`);

  const objectSet = new AdkObjectSet(adkContext);
  for (const ref of objRefs) {
    await loadObjectIntoSet(adk, objectSet, ref.name, ref.type, ctx);
  }
  return objectSet;
}

/** Selector: Package — load every package object into a new set. */
async function objectSetFromPackage(
  packageName: string,
  objectTypeFilter: string[] | undefined,
  adk: ReturnType<typeof createAdk>,
  adkContext: AdkContext,
  ctx: CliContext,
): Promise<AdkObjectSet> {
  ctx.logger.info(`🔄 Activating objects in package ${packageName}`);

  const pkg = await AdkPackage.get(packageName);
  const objects = await pkg.getObjects();

  const filtered = objectTypeFilter
    ? objects.filter((o) => objectTypeFilter.includes(o.type.toUpperCase()))
    : objects;

  ctx.logger.info(`   📋 Found ${filtered.length} objects in package`);

  const objectSet = new AdkObjectSet(adkContext);
  for (const obj of filtered) {
    await loadObjectIntoSet(adk, objectSet, obj.name, obj.type, ctx);
  }
  return objectSet;
}

/** Selector: Files — deserialize the selected files into a new set. */
async function objectSetFromFiles(
  options: ActivateCliOptions,
  objectTypeFilter: string[] | undefined,
  client: ContextClient,
  adkContext: AdkContext,
  ctx: CliContext,
): Promise<AdkObjectSet> {
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

  return AdkObjectSet.fromGenerator(
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
    const options = args as ActivateCliOptions;

    if (!ctx.getAdtClient) {
      ctx.logger.error('❌ ADT client not available. Run: adt auth login');
      process.exit(1);
    }

    const client = await ctx.getAdtClient!();
    const adkContext: AdkContext = { client: client as any };
    const adk = createAdk(client as AdtClient);

    const objectTypeFilter = options.types
      ? options.types.split(',').map((t) => t.trim().toUpperCase())
      : undefined;

    let objectSet: AdkObjectSet;

    // ── Selector: Transport ──
    if (options.transport) {
      objectSet = await objectSetFromTransport(
        options.transport,
        objectTypeFilter,
        adk,
        adkContext,
        ctx,
      );

      // ── Selector: Package ──
    } else if (options.package) {
      objectSet = await objectSetFromPackage(
        options.package,
        objectTypeFilter,
        adk,
        adkContext,
        ctx,
      );

      // ── Selector: Files ──
    } else {
      objectSet = await objectSetFromFiles(
        options,
        objectTypeFilter,
        client,
        adkContext,
        ctx,
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
