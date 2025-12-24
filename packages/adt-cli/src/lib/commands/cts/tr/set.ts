/**
 * adt cts tr set <TR> - Non-interactive transport update (scripting)
 *
 * Uses ADK layer with proper lock/unlock mechanism.
 * For interactive editing, use `adt cts tr change` (TUI).
 *
 * Usage:
 *   adt cts tr set S0DK900123 --description "New description"
 *   adt cts tr set S0DK900123 --target "QAS"
 *   adt cts tr set S0DK900123 --from-json payload.json
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { getAdtClientV2, getCliContext } from '../../../utils/adt-client-v2';
import { createProgressReporter } from '../../../utils/progress-reporter';
import { createCliLogger } from '../../../utils/logger-config';
import { AdkTransportRequest } from '@abapify/adk';

export const ctsSetCommand = new Command('set')
  .description('Update transport request (non-interactive, for scripting)')
  .argument('<transport>', 'Transport number (e.g., BHFK900123)')
  .option('-d, --description <desc>', 'New transport description')
  .option('--target <target>', 'New target system')
  .option('--from-json <file>', 'Load full payload from JSON file')
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
      // Validate: at least one update option required
      if (!options.description && !options.target && !options.fromJson) {
        console.error('❌ At least one update option is required');
        console.error('💡 Use --description, --target, or --from-json');
        process.exit(1);
      }

      const client = await getAdtClientV2();

      // Build update options
      let updateOptions: { description?: string; target?: string };

      if (options.fromJson) {
        // Load from JSON file
        progress.step(`📄 Loading payload from ${options.fromJson}...`);
        try {
          const content = readFileSync(options.fromJson, 'utf-8');
          const json = JSON.parse(content);
          updateOptions = {
            description: json.description ?? json.desc,
            target: json.target,
          };
        } catch (err) {
          console.error(
            `❌ Failed to load JSON file: ${err instanceof Error ? err.message : String(err)}`,
          );
          process.exit(1);
        }
      } else {
        updateOptions = {
          description: options.description,
          target: options.target,
        };
      }

      // Get transport via ADK
      progress.step(`🔍 Getting transport ${transport}...`);
      // ADK expects (number, ctx?) - ctx is AdkContext with client property
      const tr = await AdkTransportRequest.get(transport, { client });
      progress.done();

      // Update using ADK (handles lock/unlock automatically)
      progress.step(`🔄 Updating transport ${transport}...`);
      await tr.update(updateOptions);
      progress.done();

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              transport,
              status: 'updated',
              description: tr.description,
              target: tr.target,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`✅ Transport ${transport} updated successfully`);
        if (updateOptions.description) {
          console.log(`   Description: "${updateOptions.description}"`);
        }
        if (updateOptions.target) {
          console.log(`   Target: ${updateOptions.target}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Update failed: ${message}`);
      console.error('❌ Update failed:', message);
      process.exit(1);
    }
  });
