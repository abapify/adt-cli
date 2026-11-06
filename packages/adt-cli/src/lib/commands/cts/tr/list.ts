/**
 * adt cts tr list - List transport requests
 *
 * Uses v2 client service layer for transport operations.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../../utils/adt-client-v2';

/** One row of `client.services.transports.list()`. */
type TransportRow = Awaited<
  ReturnType<
    Awaited<ReturnType<typeof getAdtClientV2>>['services']['transports']['list']
  >
>[number];

/** Print the human-readable transport list. */
function printTransportList(
  transports: TransportRow[],
  displayTransports: TransportRow[],
  maxResults: number,
): void {
  // Clear the loading line
  process.stdout.write('\r\x1b[K');

  if (transports.length === 0) {
    console.log('📭 No transports found');
    return;
  }

  console.log(`📋 Found ${transports.length} transports`);

  for (const tr of displayTransports) {
    const status = tr.status === 'D' ? '📂' : '📁';
    console.log(`${status} ${tr.number} - ${tr.desc || '(no description)'}`);
    console.log(
      `   Owner: ${tr.owner || 'unknown'} | Status: ${tr.status || 'unknown'}`,
    );
  }

  if (transports.length > maxResults) {
    console.log(
      `\n💡 Showing ${maxResults} of ${transports.length} (use --max to see more)`,
    );
  }
}

export const ctsListCommand = new Command('list')
  .description('List transport requests')
  .option('-m, --max <number>', 'Maximum results', '50')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();

      process.stdout.write('🔍 Listing transports...');

      // Use the transport service to list transports
      const transports = await client.services.transports.list();

      const maxResults = Number.parseInt(options.max, 10) || 50;
      const displayTransports = transports.slice(0, maxResults);

      if (options.json) {
        // Clear the loading line first
        process.stdout.write('\r\x1b[K');
        console.log(JSON.stringify(displayTransports, null, 2));
      } else {
        printTransportList(transports, displayTransports, maxResults);
      }
    } catch (error) {
      console.error(
        '❌ List failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
