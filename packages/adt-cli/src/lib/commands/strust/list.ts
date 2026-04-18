/**
 * `adt strust list` — List SAP STRUST PSE identities.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { extractAtomEntries } from './utils';

export const strustListCommand = new Command('list')
  .description('List Personal Security Environments (STRUST identities)')
  .option('--json', 'Output results as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const client = await getAdtClientV2();
      const result = await client.adt.system.security.pses.list();
      const entries = extractAtomEntries(result);

      if (options.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      console.log(
        `Found ${entries.length} PSE identit${entries.length === 1 ? 'y' : 'ies'}:\n`,
      );
      for (const entry of entries) {
        console.log(`  ${entry.id.padEnd(18)} ${entry.title}`);
      }
    } catch (error) {
      console.error(
        'strust list failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
