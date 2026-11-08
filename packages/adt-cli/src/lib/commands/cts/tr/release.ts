/**
 * adt cts tr release <TR> - Release transport request
 *
 * Uses ADK layer for proper transport release.
 * Optionally runs pre-release checks (ATC).
 *
 * Usage:
 *   adt cts tr release TRLK900123
 *   adt cts tr release TRLK900123 --skip-check
 *   adt cts tr release TRLK900123 --json
 */

import { Command } from 'commander';
import { confirm } from '@inquirer/prompts';
import { getAdtClientV2, getCliContext } from '../../../utils/adt-client-v2';
import { createProgressReporter } from '../../../utils/progress-reporter';
import { createCliLogger } from '../../../utils/logger-config';
import { CtsTransportLifecycleService } from '../../../services/cts';
import type { Logger } from '@abapify/logger';

const writeLine = (line: string) => {
  process.stdout.write(`${line}\n`);
};

const writeError = (line: string) => {
  process.stderr.write(`${line}\n`);
};

interface CommandWithLogger extends Command {
  logger?: Logger;
}

type ProgressReporter = ReturnType<typeof createProgressReporter>;
type TransportSummary = Awaited<
  ReturnType<CtsTransportLifecycleService['getTransport']>
>;
type ReleaseResult = Awaited<
  ReturnType<CtsTransportLifecycleService['release']>
>;

/** Print the transport summary before release. */
function printTransportInfo(summary: TransportSummary): void {
  writeLine(`\n📋 Transport: ${summary.transport}`);
  writeLine(`   Description: ${summary.description || '-'}`);
  writeLine(`   Owner: ${summary.owner || '-'}`);
  writeLine(
    `   Target: ${summary.targetDescription || summary.target || 'LOCAL'}`,
  );
  writeLine(`   Status: ${summary.statusText}`);
  writeLine(`   Tasks: ${summary.taskCount}`);
  writeLine(`   Objects: ${summary.objectCount}`);
}

/** Report that the transport is already released. */
function reportAlreadyReleased(
  summary: TransportSummary,
  json: boolean | undefined,
  progress: ProgressReporter,
): void {
  if (json) {
    progress.clear();
    writeLine(
      JSON.stringify(
        { transport: summary.transport, status: 'already_released' },
        null,
        2,
      ),
    );
  } else {
    writeLine(`ℹ️  Transport ${summary.transport} is already released`);
  }
}

/** Prompt for release confirmation; exit if the user declines. */
async function confirmRelease(
  transport: TransportSummary['transport'],
): Promise<void> {
  const shouldRelease = await confirm({
    message: `Release transport ${transport}?`,
    default: true,
  });

  if (!shouldRelease) {
    writeLine('\n❌ Release cancelled');
    process.exit(0);
  }
}

/** Print the release result as JSON or a success message. */
function printReleaseResult(
  result: ReleaseResult,
  summary: TransportSummary,
  json: boolean | undefined,
): void {
  if (json) {
    writeLine(JSON.stringify(result, null, 2));
  } else {
    writeLine(`\n✅ Transport ${result.transport} released successfully!`);
    writeLine(
      `   Target: ${summary.targetDescription || summary.target || 'LOCAL'}`,
    );
  }
}

export const ctsReleaseCommand = new Command('release')
  .description('Release transport request')
  .argument('<transport>', 'Transport number (e.g., TRLK900123)')
  .option('--skip-check', 'Skip pre-release validation')
  .option('--release-all', 'Release all tasks first, then the transport')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output result as JSON')
  .action(async function (this: CommandWithLogger, transport: string, options) {
    const globalOpts = this.optsWithGlobals?.() ?? {};
    const ctx = getCliContext();
    const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
    const compact = !verboseFlag;
    const logger =
      this.logger ?? ctx.logger ?? createCliLogger({ verbose: verboseFlag });
    const progress = createProgressReporter({ compact, logger });

    try {
      const client = await getAdtClientV2({
        logger,
        enableLogging: true,
      });
      const lifecycle = new CtsTransportLifecycleService(client);

      progress.step(`🔍 Getting transport ${transport}...`);
      let summary;
      try {
        summary = await lifecycle.getTransport(transport);
      } catch (_err) {
        progress.done();
        writeError(`❌ Transport ${transport} not found or not accessible`);
        process.exit(1);
      }

      progress.done();

      // Check if already released
      if (summary.status === 'R') {
        reportAlreadyReleased(summary, options.json, progress);
        return;
      }

      // Display transport info
      if (!options.json) {
        printTransportInfo(summary);
      }

      // Step 2: Pre-release check (not yet implemented - check endpoint not available)
      if (!options.skipCheck && !options.json) {
        writeLine(
          '\n💡 Pre-release checks not yet implemented (use --skip-check to suppress)',
        );
      }

      // Step 3: Confirm release
      if (!options.yes && !options.json) {
        await confirmRelease(summary.transport);
      }

      progress.step(`🚀 Releasing transport ${summary.transport}...`);
      const result = await lifecycle.release({
        transport: summary.transport,
        releaseAll: options.releaseAll,
      });
      progress.done();

      printReleaseResult(result, summary, options.json);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done();
      writeError(`❌ Release failed: ${message}`);
      process.exit(1);
    }
  });
