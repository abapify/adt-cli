/**
 * Export Command Plugin
 *
 * CLI-agnostic command for exporting local files to SAP.
 * Uses the CliContext for ADT client access.
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';
import type { ExportResult } from '../types';
import {
  collectExportObjects,
  prepareExportFiles,
  resolveEffectiveRootPackage,
} from './export-collect';
import {
  deployAndMapResults,
  displayExportResults,
  displayVerificationResults,
  verifyPackageAssignments,
} from './export-deploy';
import { runPreDeploySteps } from './export-predeploy';
import type { ExportCliOptions } from './export-types';

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
        'Release locks with handles persisted by this CLI before saving',
      default: false,
    },
    {
      flags: '--verify',
      description:
        'After deploy, verify each object ended up in the correct package on SAP',
      default: false,
    },
    {
      flags: '--abap-language-version <version>',
      description:
        'ABAP language version for new objects (2=keyUser, 5=cloud). Required for BTP systems.',
    },
  ],

  async execute(args: Record<string, unknown>, ctx: CliContext) {
    const options = args as unknown as ExportCliOptions;

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

    // Resolve source path, run early checks and build the file tree
    const { fileTree } = await prepareExportFiles(options, ctx);

    const result: ExportResult = {
      discovered: 0,
      saved: 0,
      activated: 0,
      skipped: 0,
      failed: 0,
      objects: [],
    };

    try {
      const runtime = await collectExportObjects(
        fileTree,
        options,
        result,
        ctx,
      );
      if (!runtime) {
        displayExportResults(result, ctx.logger);
        return;
      }
      const { objectSet } = runtime;

      // Derive effective root package: either explicit --package or
      // resolved from objects that already have packageRef (e.g., from .abapgit.xml).
      const effectiveRootPackage = resolveEffectiveRootPackage(
        objectSet,
        options,
        ctx,
      );

      // ============================================
      // Pre-deploy steps
      // ============================================
      await runPreDeploySteps(runtime, effectiveRootPackage, options, ctx);

      // ============================================
      // Deploy using AdkObjectSet (save + activate)
      // ============================================
      await deployAndMapResults(objectSet, options, result, ctx);

      // ============================================
      // Post-deploy: verify package assignments
      // ============================================
      if (options.verify && !options.dryRun) {
        ctx.logger.info(
          `\n🔍 Verifying package assignments for ${objectSet.size} objects...`,
        );
        result.verification = await verifyPackageAssignments(
          objectSet,
          ctx.logger,
        );
        displayVerificationResults(result.verification, ctx.logger);
      }
    } catch (error) {
      ctx.logger.error(
        `❌ Export failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }

    // Display results
    displayExportResults(result, ctx.logger);

    // Exit with error if there were failures or verification mismatches
    if (result.failed > 0 || (result.verification?.mismatched ?? 0) > 0) {
      process.exit(1);
    }
  },
};

export default exportCommand;
