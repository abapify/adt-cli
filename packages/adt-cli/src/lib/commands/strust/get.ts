/**
 * `adt strust get <context> <applic>` — List certificates of a PSE.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { extractAtomEntries } from './utils';

export const strustGetCommand = new Command('get')
  .description('List certificates installed in a PSE')
  .argument('<context>', 'PSE context (e.g., SSLC, SSLS)')
  .argument('<applic>', 'PSE application (e.g., DFAULT, ANONYM)')
  .option('--json', 'Output as JSON')
  .action(
    async (context: string, applic: string, options: { json?: boolean }) => {
      try {
        const client = await getAdtClientV2();
        const result = await client.adt.system.security.pses.listCertificates(
          context,
          applic,
        );
        const entries = extractAtomEntries(result);

        if (options.json) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        console.log(
          `PSE ${context}/${applic} — ${entries.length} certificate${
            entries.length === 1 ? '' : 's'
          }:\n`,
        );
        for (const entry of entries) {
          console.log(`  [${entry.id}] ${entry.title}`);
        }
      } catch (error) {
        console.error(
          'strust get failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
