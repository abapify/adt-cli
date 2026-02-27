/**
 * adt cts tr delete <TR> - Delete transport with mandatory confirmation
 *
 * Safety-first design:
 * - ALWAYS prompts for confirmation (no --force flag)
 * - Shows transport details before deletion
 * - Requires typing transport number to confirm
 *
 * Usage:
 *   adt cts tr delete S0DK900123
 */

import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import { getAdtClientV2, getCliContext } from '../../../utils/adt-client-v2';
import { createProgressReporter } from '../../../utils/progress-reporter';
import { createCliLogger } from '../../../utils/logger-config';

export const ctsDeleteCommand = new Command('delete')
  .description('Delete transport request (with mandatory confirmation)')
  .argument('<transport>', 'Transport number (e.g., BHFK900123)')
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

      // Step 1: Fetch transport details to show user what they're deleting
      progress.step(`🔍 Getting transport ${transport}...`);

      let transportInfo: any;
      try {
        transportInfo = await client.services.transports.get(transport);
      } catch (err) {
        console.error(`❌ Transport ${transport} not found or not accessible`);
        process.exit(1);
      }

      progress.done();

      const request = transportInfo?.request;
      if (!request) {
        console.error(`❌ Transport ${transport} not found`);
        process.exit(1);
      }

      // Step 2: Display warning with transport details
      console.log(
        '\n⚠️  WARNING: You are about to DELETE a transport request\n',
      );
      console.log(`   🚛 Transport: ${request.number}`);
      console.log(`   📝 Description: ${request.desc || '-'}`);
      console.log(`   👤 Owner: ${request.owner || '-'}`);
      console.log(
        `   📊 Status: ${request.status_text || request.status || '-'}`,
      );

      // Count objects
      const taskCount = request.task?.length || 0;
      let objectCount = 0;
      if (request.task) {
        const tasks = Array.isArray(request.task)
          ? request.task
          : [request.task];
        for (const task of tasks) {
          if (task.abap_object) {
            const objs = Array.isArray(task.abap_object)
              ? task.abap_object
              : [task.abap_object];
            objectCount += objs.length;
          }
        }
      }
      if (request.all_objects?.abap_object) {
        const objs = Array.isArray(request.all_objects.abap_object)
          ? request.all_objects.abap_object
          : [request.all_objects.abap_object];
        objectCount = Math.max(objectCount, objs.length);
      }

      console.log(`   📁 Tasks: ${taskCount}`);
      console.log(`   📦 Objects: ${objectCount}`);
      console.log('\n   ⛔ This action is IRREVERSIBLE!\n');

      // Step 3: Require user to type transport number to confirm
      const confirmation = await input({
        message: `Type the transport number to confirm deletion:`,
        validate: (value) => {
          if (value.trim().toUpperCase() === transport.toUpperCase()) {
            return true;
          }
          return 'Transport number does not match. Type exactly to confirm.';
        },
      });

      if (confirmation.trim().toUpperCase() !== transport.toUpperCase()) {
        console.log('\n❌ Deletion cancelled');
        process.exit(0);
      }

      // Step 4: Delete the transport
      progress.step(`🗑️  Deleting transport ${transport}...`);

      await client.services.transports.delete(transport);

      progress.done();

      if (options.json) {
        console.log(
          JSON.stringify({ deleted: transport, success: true }, null, 2),
        );
      } else {
        console.log(`\n✅ Transport ${transport} deleted successfully`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Delete failed: ${message}`);
      console.error('❌ Delete failed:', message);
      process.exit(1);
    }
  });
