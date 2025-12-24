/**
 * adt cts tr release <TR> - Release transport request
 *
 * Uses ADK layer for proper transport release.
 * Optionally runs pre-release checks (ATC).
 *
 * Usage:
 *   adt cts tr release S0DK900123
 *   adt cts tr release S0DK900123 --skip-check
 *   adt cts tr release S0DK900123 --json
 */

import { Command } from 'commander';
import { confirm } from '@inquirer/prompts';
import { getAdtClientV2, getCliContext } from '../../../utils/adt-client-v2';
import { createProgressReporter } from '../../../utils/progress-reporter';
import { createCliLogger } from '../../../utils/logger-config';
import { AdkTransportRequest } from '@abapify/adk';

export const ctsReleaseCommand = new Command('release')
  .description('Release transport request')
  .argument('<transport>', 'Transport number (e.g., BHFK900123)')
  .option('--skip-check', 'Skip pre-release validation')
  .option('--release-all', 'Release all tasks first, then the transport')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output result as JSON')
  .action(async function (this: Command, transport: string, options) {
    const globalOpts = this.optsWithGlobals?.() ?? {};
    const ctx = getCliContext();
    const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
    const compact = !verboseFlag;
    const logger =
      (this as any).logger ??
      ctx.logger ??
      createCliLogger({ verbose: verboseFlag });
    const progress = createProgressReporter({ compact, logger });

    try {
      const client = await getAdtClientV2();

      // Step 1: Get transport via ADK
      progress.step(`🔍 Getting transport ${transport}...`);
      // ADK expects (number, ctx?) - ctx is AdkContext with client property

      let tr: AdkTransportRequest;
      try {
        tr = await AdkTransportRequest.get(transport, { client });
      } catch (err) {
        console.error(`❌ Transport ${transport} not found or not accessible`);
        process.exit(1);
      }

      progress.done();

      // Check if already released
      if (tr.status === 'R') {
        console.log(`ℹ️  Transport ${transport} is already released`);
        if (options.json) {
          console.log(
            JSON.stringify({ transport, status: 'already_released' }, null, 2),
          );
        }
        process.exit(0);
      }

      // Display transport info
      if (!options.json) {
        console.log(`\n📋 Transport: ${tr.number}`);
        console.log(`   Description: ${tr.description || '-'}`);
        console.log(`   Owner: ${tr.owner || '-'}`);
        console.log(
          `   Target: ${tr.targetDescription || tr.target || 'LOCAL'}`,
        );
        console.log(`   Status: ${tr.statusText}`);
        console.log(`   Tasks: ${tr.tasks.length}`);
        console.log(`   Objects: ${tr.objects.length}`);
      }

      // Step 2: Pre-release check (not yet implemented - check endpoint not available)
      if (!options.skipCheck) {
        // For now, just warn that checks are not implemented
        if (!options.json) {
          console.log(
            '\n💡 Pre-release checks not yet implemented (use --skip-check to suppress)',
          );
        }
      }

      // Step 3: Confirm release
      if (!options.yes && !options.json) {
        const shouldRelease = await confirm({
          message: `Release transport ${transport}?`,
          default: true,
        });

        if (!shouldRelease) {
          console.log('\n❌ Release cancelled');
          process.exit(0);
        }
      }

      // Step 4: Release the transport using ADK
      progress.step(`🚀 Releasing transport ${transport}...`);

      let result;
      if (options.releaseAll) {
        // Release all tasks first, then the transport
        result = await tr.releaseAll();
      } else {
        // Release transport only (tasks must already be released)
        result = await tr.release();
      }

      progress.done();

      if (!result.success) {
        console.error(`❌ Release failed: ${result.message}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              transport,
              status: 'released',
              result,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`\n✅ Transport ${transport} released successfully!`);
        console.log(
          `   Target: ${tr.targetDescription || tr.target || 'LOCAL'}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Release failed: ${message}`);
      console.error('❌ Release failed:', message);
      process.exit(1);
    }
  });
