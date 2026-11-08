/**
 * Deploy, activation and result reporting for the export command.
 */

import type { AdkObjectSet } from '@abapify/adk';
import type { CliContext } from '@abapify/adt-plugin';
import type {
  ExportResult,
  VerificationResult,
  VerificationDetail,
} from '../types';
import type { ExportCliOptions } from './export-types';

/**
 * Display export results in console
 */
export function displayExportResults(
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
 * Verify that deployed objects ended up in the expected SAP packages.
 *
 * Reloads each object from SAP and compares its current package
 * against the target package resolved from the abapGit folder structure.
 */
export async function verifyPackageAssignments(
  objectSet: Iterable<import('@abapify/adk').AdkObject>,
  logger: CliContext['logger'],
): Promise<VerificationResult> {
  const verification: VerificationResult = {
    total: 0,
    correct: 0,
    mismatched: 0,
    errors: 0,
    details: [],
  };

  for (const obj of objectSet) {
    const targetPkg = (obj as any)._data?.packageRef?.name as
      string | undefined;
    if (!targetPkg) continue;

    verification.total++;
    const detail: VerificationDetail = {
      type: obj.type,
      name: obj.name,
      expectedPackage: targetPkg,
      status: 'error',
    };

    try {
      // Reload from SAP to get current server state
      await obj.load();
      const actualPkg = (obj as any).package as string | undefined;
      detail.actualPackage = actualPkg ?? '';

      if (actualPkg === targetPkg) {
        detail.status = 'correct';
        verification.correct++;
      } else {
        detail.status = 'mismatched';
        verification.mismatched++;
        logger.warn(
          `   ⚠️ ${obj.name}: expected ${targetPkg}, got ${actualPkg ?? '(none)'}`,
        );
      }
    } catch (err) {
      detail.status = 'error';
      detail.error = err instanceof Error ? err.message : String(err);
      verification.errors++;
      logger.warn(`   ⚠️ ${obj.name}: verification failed — ${detail.error}`);
    }

    verification.details.push(detail);
  }

  return verification;
}

/**
 * Display verification results in console
 */
export function displayVerificationResults(
  verification: VerificationResult,
  logger: CliContext['logger'],
): void {
  logger.info(`\n📋 Package Verification Results:`);
  logger.info(`   Total:      ${verification.total}`);
  logger.info(`   ✅ Correct:   ${verification.correct}`);
  if (verification.mismatched > 0) {
    logger.error(`   ❌ Mismatched: ${verification.mismatched}`);
  }
  if (verification.errors > 0) {
    logger.warn(`   ⚠️ Errors:    ${verification.errors}`);
  }

  // Show mismatched details
  const mismatches = verification.details.filter(
    (d) => d.status === 'mismatched',
  );
  if (mismatches.length > 0) {
    logger.error('\n❌ Package mismatches:');
    for (const m of mismatches) {
      logger.error(
        `   ${m.type} ${m.name}: expected ${m.expectedPackage}, got ${m.actualPackage ?? '(none)'}`,
      );
    }
  }
}

type DeployOutcome = Awaited<ReturnType<AdkObjectSet['deploy']>>;

/** Map deploy save results onto the export result and log unchanged objects. */
function mapSaveResults(
  save: DeployOutcome['save'],
  result: ExportResult,
  ctx: CliContext,
): void {
  result.saved = save.success;
  result.failed = save.failed;

  for (const r of save.results) {
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
  if (save.unchanged > 0) {
    const unchangedNames = save.results
      .filter((r) => r.unchanged)
      .map((r) => r.object.name);
    ctx.logger.info(
      `\n⏭️ ${save.unchanged} unchanged: ${unchangedNames.join(', ')}`,
    );
  }
}

/** Map activation results onto the export result. */
function mapActivationResults(
  activation: NonNullable<DeployOutcome['activation']>,
  result: ExportResult,
  ctx: CliContext,
): void {
  result.activated = activation.success;

  if (activation.success > 0) {
    ctx.logger.info(`\n✅ ${activation.success} objects activated`);
  }
  if (activation.failed > 0) {
    ctx.logger.warn(`⚠️ ${activation.failed} objects failed activation`);
    for (const msg of activation.messages) {
      ctx.logger.warn(`   ${msg}`);
    }
  }
}

/** Deploy the object set (or dry-run) and map the results. */
export async function deployAndMapResults(
  objectSet: AdkObjectSet,
  options: ExportCliOptions,
  result: ExportResult,
  ctx: CliContext,
): Promise<void> {
  if (options.dryRun) {
    // Dry run - just mark as would-be-saved
    for (const obj of objectSet) {
      result.objects.push({
        type: obj.type,
        name: obj.name,
        status: 'saved', // Would be saved
      });
    }
    result.saved = objectSet.size;
    ctx.logger.info(`\n🔍 Dry run: ${objectSet.size} objects would be saved`);
    return;
  }

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
        ctx.logger.info(`   💾 [${saved}/${total}] ${obj.kind} ${obj.name}`);
      }
    },
  });

  // Map save results
  mapSaveResults(deployResult.save, result, ctx);

  // Map activation results
  if (deployResult.activation) {
    mapActivationResults(deployResult.activation, result, ctx);
  }
  // Note: deploy() handles unlockAll() automatically
}
