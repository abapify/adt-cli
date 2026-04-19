/**
 * adt cts tr reassign <TR> <new-owner> - Change transport/task owner
 *
 * Reassigns ownership of a transport request (and optionally all its tasks)
 * to a new SAP user. Only modifiable (not yet released) tasks are affected
 * when the --recursive flag is used.
 *
 * Usage:
 *   adt cts tr reassign S0DK900123 NEWUSER
 *   adt cts tr reassign S0DK900123 NEWUSER --recursive
 *   adt cts tr reassign S0DK900123 NEWUSER --json
 */

import { Command } from 'commander';
import { getAdtClientV2, getCliContext } from '../../../utils/adt-client-v2';
import { createProgressReporter } from '../../../utils/progress-reporter';
import { createCliLogger } from '../../../utils/logger-config';
import { AdkTransportRequest } from '@abapify/adk';

export const ctsReassignCommand = new Command('reassign')
  .description('Change the owner of a transport request')
  .argument('<transport>', 'Transport number (e.g., BHFK900123)')
  .argument('<new-owner>', 'SAP username of the new owner')
  .option(
    '-r, --recursive',
    'Also reassign all modifiable tasks of the transport',
    false,
  )
  .option('--json', 'Output result as JSON')
  .action(async function (
    this: Command,
    transport: string,
    newOwner: string,
    options: { recursive: boolean; json: boolean },
  ) {
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
      let tr: AdkTransportRequest;
      try {
        tr = await AdkTransportRequest.get(transport, { client });
      } catch (err) {
        console.error(`❌ Transport ${transport} not found or not accessible`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
      progress.done();

      // Check if already released
      if (tr.status === 'R') {
        console.error(`❌ Transport ${transport} is already released`);
        process.exit(1);
      }

      const previousOwner = tr.owner;

      // Step 2: Reassign
      progress.step(
        `🔄 Reassigning ${transport} from ${previousOwner} to ${newOwner}${options.recursive ? ' (recursive)' : ''}...`,
      );
      await tr.reassign(newOwner, options.recursive);
      progress.done();

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              transport,
              previousOwner,
              newOwner,
              recursive: options.recursive,
              status: 'reassigned',
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`✅ Transport ${transport} reassigned successfully`);
        console.log(`   Previous owner: ${previousOwner}`);
        console.log(`   New owner:      ${newOwner}`);
        if (options.recursive) {
          console.log(`   Tasks: reassigned (modifiable tasks only)`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Reassign failed: ${message}`);
      console.error('❌ Reassign failed:', message);
      process.exit(1);
    }
  });
