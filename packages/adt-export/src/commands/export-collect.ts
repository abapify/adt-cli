/**
 * Source scanning and object collection for the export command: resolve
 * files, load the format plugin and build the ADK object set.
 */

import type { CliContext, ExportOptions } from '@abapify/adt-plugin';
import {
  AdkObjectSet,
  type AdkContext,
  tryGetGlobalContext,
} from '@abapify/adk';
import { createLockService, FileLockStore } from '@abapify/adt-locks';
import type { ExportResult } from '../types';
import {
  createFileTree,
  FilteredFileTree,
  findAbapGitRoot,
  resolveFilesRelativeToRoot,
} from '../utils/filetree';
import { loadFormatPlugin } from '../utils/format-plugin';
import type { ExportCliOptions, ExportClient } from './export-types';

/**
 * Early check: PREFIX folder logic requires an explicit --package flag.
 * Fail before scanning files / loading plugins / authenticating with SAP.
 */
async function checkPrefixFolderLogic(
  sourcePath: string,
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<void> {
  if (options.package) return;

  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const abapGitXmlPath = join(sourcePath, '.abapgit.xml');
  if (!existsSync(abapGitXmlPath)) return;

  const xml = readFileSync(abapGitXmlPath, 'utf-8');
  const { parseAbapGitMetadata } = await import('@abapify/adt-plugin-abapgit');
  const { folderLogic } = parseAbapGitMetadata(xml);
  if (folderLogic === 'prefix') {
    ctx.logger.error('❌ Root package is required for PREFIX folder logic.');
    ctx.logger.info('   Use -p <PACKAGE> to specify the root ABAP package.');
    ctx.logger.info('   Example: npx adt export -p ZABAPGIT_EXAMPLES');
    process.exit(1);
  }
}

/** Log package assignments (resolved by the format plugin). */
function logPackageAssignments(
  objectSet: AdkObjectSet,
  effectiveRootPackage: string,
  ctx: CliContext,
): void {
  const pkgMap = new Map<string, string[]>();
  for (const obj of objectSet) {
    const pkgName = (obj as any)._data?.packageRef?.name as string | undefined;
    if (pkgName) {
      if (!pkgMap.has(pkgName)) pkgMap.set(pkgName, []);
      pkgMap.get(pkgName)!.push(obj.name);
    }
  }
  if (pkgMap.size > 0) {
    ctx.logger.info(`📦 Package resolution: ${effectiveRootPackage}`);
    for (const [pkg, objects] of pkgMap) {
      if (pkg !== effectiveRootPackage) {
        ctx.logger.info(`   📁 ${pkg}: ${objects.join(', ')}`);
      }
    }
  }
}

/**
 * Derive the effective root package: either explicit --package or resolved
 * from objects that already have packageRef (e.g., from .abapgit.xml).
 *
 * When --package is provided, it's used as the root for folder logic.
 * When omitted, we look at objects that already have packageRef from the
 * format plugin and pick the shortest (= root-most) one.
 */
export function resolveEffectiveRootPackage(
  objectSet: AdkObjectSet,
  options: ExportCliOptions,
  ctx: CliContext,
): string | undefined {
  let effectiveRootPackage = options.package;

  if (!effectiveRootPackage) {
    // Find root from objects that already have packageRef
    for (const obj of objectSet) {
      const pkgName = (obj as any)._data?.packageRef?.name as
        string | undefined;
      if (
        pkgName &&
        (!effectiveRootPackage || pkgName.length < effectiveRootPackage.length)
      ) {
        effectiveRootPackage = pkgName;
      }
    }
  }

  // Log package assignments (resolved by format plugin)
  if (effectiveRootPackage) {
    logPackageAssignments(objectSet, effectiveRootPackage, ctx);
  }

  return effectiveRootPackage;
}

/** Shared state produced by collectExportObjects. */
export interface ExportRuntime {
  client: ExportClient;
  adkContext: AdkContext;
  objectSet: AdkObjectSet;
}

/**
 * Load the format plugin, scan the file tree and collect the export
 * objects into an AdkObjectSet (applying the optional type filter).
 * Returns `null` when nothing survives filtering.
 */
export async function collectExportObjects(
  fileTree: ReturnType<typeof createFileTree>,
  options: ExportCliOptions,
  result: ExportResult,
  ctx: CliContext,
): Promise<ExportRuntime | null> {
  // Parse object types filter
  const objectTypes = options.types
    ? options.types.split(',').map((t) => t.trim().toUpperCase())
    : undefined;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (await ctx.getAdtClient!()) as any;
  // Reuse global context's lock service if available, otherwise create one
  const globalCtx = tryGetGlobalContext();
  const lockStore = globalCtx?.lockStore ?? new FileLockStore();
  const lockService =
    globalCtx?.lockService ??
    createLockService(client as any, { store: lockStore });
  const adkContext: AdkContext = {
    client: client as any,
    lockStore,
    lockService,
  };

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
              objectTypes.includes(objType) || objectTypes.includes(objPrefix);
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
    return null;
  }

  return { client, adkContext, objectSet };
}

/**
 * Resolve source/files, run the early PREFIX check and build the
 * (filtered) export file tree.
 */
export async function prepareExportFiles(
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<{ fileTree: ReturnType<typeof createFileTree> }> {
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

  // Early check: PREFIX folder logic requires an explicit --package flag.
  // Fail before scanning files / loading plugins / authenticating with SAP.
  await checkPrefixFolderLogic(sourcePath, options, ctx);

  ctx.logger.info('🚀 Starting export...');
  ctx.logger.info(`📁 Source: ${sourcePath}`);
  ctx.logger.info(`🎯 Format: ${options.format}`);
  if (specificFiles) ctx.logger.info(`📄 Files: ${specificFiles.join(', ')}`);
  if (options.transport) ctx.logger.info(`🚚 Transport: ${options.transport}`);
  if (options.package) ctx.logger.info(`📦 Package: ${options.package}`);
  if (options.dryRun) ctx.logger.info(`🔍 Mode: Dry run (no changes)`);

  // Create FileTree — wrap with filter when deploying specific files
  const fullFileTree = createFileTree(sourcePath);
  let fileTree = fullFileTree;
  if (specificFiles) {
    const relFiles = resolveFilesRelativeToRoot(
      specificFiles,
      ctx.cwd,
      sourcePath,
    );
    fileTree = new FilteredFileTree(fullFileTree, relFiles);
  }

  return { fileTree };
}
