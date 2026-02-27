/**
 * adt cts tr get <TR> - Get transport details
 *
 * Uses ADK (AdkTransportRequest) for transport operations.
 * Renders via the Transport Page using the router.
 */

import { Command } from 'commander';
import { getAdtClientV2, getCliContext } from '../../../utils/adt-client-v2';
import { createProgressReporter } from '../../../utils/progress-reporter';
import { createCliLogger } from '../../../utils/logger-config';
import { router } from '../../../ui/router';
// Import to trigger page registration
import '../../../ui/pages/transport';

export const ctsGetCommand = new Command('get')
  .description('Get transport request details')
  .argument('<transport>', 'Transport number (e.g., S0DK942971)')
  .option('--json', 'Output as JSON')
  .option('--objects', 'Show list of objects in transport')
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

      progress.step(`🔍 Getting transport ${transport}...`);

      // Use the router to navigate to the transport page
      // This uses ADK (AdkTransportRequest) under the hood
      const page = await router.navTo(client, 'RQRQ', {
        name: transport,
        showObjects: options.objects ?? false,
      });

      progress.clear(); // Clear progress line before printing page

      if (options.json) {
        // For JSON output, get the raw transport data
        const response = await client.services.transports.get(transport);
        console.log(JSON.stringify(response, null, 2));
      } else {
        // Use the page's print function for formatted output
        page.print();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Get failed: ${message}`);
      console.error('❌ Get failed:', message);
      process.exit(1);
    }
  });
