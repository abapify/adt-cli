/**
 * adt cts search - Search transports
 *
 * Uses the /sap/bc/adt/cts/transports?_action=FIND endpoint.
 * Note: This basic endpoint only supports user and trfunction filters.
 * Results are grouped by status for display.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import {
  TransportFunction,
  normalizeTransportFindResponse,
  type CtsReqHeader,
  type TransportFindParams,
} from '@abapify/adt-contracts';

// Status icons
const STATUS_ICONS: Record<string, string> = {
  D: '📝', // Modifiable
  R: '🔒', // Released
  O: '🔄', // Release started
  P: '⏳', // Release in preparation
  L: '🔐', // Locked
};

// Human-readable function names
const FUNCTION_NAMES: Record<string, string> = {
  K: 'Workbench',
  W: 'Customizing',
  T: 'Transport of Copies',
  S: 'Dev/Correction',
  R: 'Repair',
  X: 'Unclassified',
  Q: 'Customizing Task',
};

/**
 * Format a single transport for display
 */
function formatTransport(tr: CtsReqHeader, index: number, total: number): void {
  const isLast = index === total - 1;
  const prefix = isLast ? '└──' : '├──';
  const statusIcon = STATUS_ICONS[tr.TRSTATUS] || '📄';
  const funcName = FUNCTION_NAMES[tr.TRFUNCTION] || tr.TRFUNCTION;

  // Main line: transport number and description
  console.log(`${prefix} ${statusIcon} ${tr.TRKORR}`);
  console.log(`    ${tr.AS4TEXT || '(no description)'}`);
  console.log(`    ${funcName} • ${tr.AS4USER} • ${tr.AS4DATE}`);

  // Add spacing between entries
  if (!isLast) {
    console.log('');
  }
}

/**
 * Parse type option to API format
 */
function parseType(type?: string): string | undefined {
  if (!type) return undefined;

  const typeMap: Record<string, string> = {
    workbench: TransportFunction.WORKBENCH,
    customizing: TransportFunction.CUSTOMIZING,
    copies: TransportFunction.TRANSPORT_OF_COPIES,
    k: TransportFunction.WORKBENCH,
    w: TransportFunction.CUSTOMIZING,
    t: TransportFunction.TRANSPORT_OF_COPIES,
  };

  return typeMap[type.toLowerCase()] || type.toUpperCase();
}

/**
 * Build the parenthesized filter description for the search header
 */
function describeFilters(params: TransportFindParams): string {
  const filterParts: string[] = [];
  if (params.user !== '*') filterParts.push(`user=${params.user}`);
  if (params.trfunction !== '*') filterParts.push(`type=${params.trfunction}`);
  return filterParts.length > 0 ? ` (${filterParts.join(', ')})` : '';
}

/**
 * Group the displayed transports by status and print each non-empty group
 */
function printTransportGroups(displayTransports: CtsReqHeader[]): void {
  const groups: Array<{ icon: string; label: string; items: CtsReqHeader[] }> =
    [
      {
        icon: '📂',
        label: 'Modifiable',
        items: displayTransports.filter(
          (t: CtsReqHeader) => t.TRSTATUS === 'D',
        ),
      },
      {
        icon: '📁',
        label: 'Released',
        items: displayTransports.filter(
          (t: CtsReqHeader) => t.TRSTATUS === 'R',
        ),
      },
      {
        icon: '📋',
        label: 'Other',
        items: displayTransports.filter(
          (t: CtsReqHeader) => t.TRSTATUS !== 'D' && t.TRSTATUS !== 'R',
        ),
      },
    ];

  for (const { icon, label, items } of groups) {
    if (items.length > 0) {
      console.log(`\n${icon} ${label} (${items.length})`);
      items.forEach((tr: CtsReqHeader, i: number) =>
        formatTransport(tr, i, items.length),
      );
    }
  }
}

export const ctsSearchCommand = new Command('search')
  .description('Search transport requests')
  .option('-u, --user <user>', 'Filter by owner (* for all)', '*')
  .option(
    '-t, --type <type>',
    'Filter by type: workbench/customizing/copies or K/W/T',
    '*',
  )
  .option('-m, --max <number>', 'Maximum results to display', '50')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();

      // Build API parameters (basic find endpoint only supports user and trfunction)
      const params: TransportFindParams = {
        _action: 'FIND',
        user: options.user || '*',
        trfunction: parseType(options.type) || '*',
      };

      console.log(`🔍 Searching transports${describeFilters(params)}...`);

      // Call the API via adt.cts.transports.find
      const result = await client.adt.cts.transports.find(params);

      // Normalize response to array
      const transports = normalizeTransportFindResponse(result);
      const maxResults = options.max ? Number.parseInt(options.max, 10) : 50;
      const displayTransports = transports.slice(0, maxResults);

      if (options.json) {
        console.log(JSON.stringify(transports, null, 2));
      } else if (transports.length === 0) {
        console.log('\n📭 No transports found matching the criteria');
      } else {
        // Group by status for display
        printTransportGroups(displayTransports);

        if (transports.length > maxResults) {
          console.log(
            `\n💡 Showing ${maxResults} of ${transports.length} transports (use --max to see more)`,
          );
        }
      }

      console.log('\n✅ Search complete');
    } catch (error) {
      console.error(
        '❌ Search failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
