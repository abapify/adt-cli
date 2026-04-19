/**
 * `adt flp list-tiles` — list Fiori Launchpad tiles (CHIPs).
 *
 * With no `--catalog` argument this lists every tile on the system.
 * With `--catalog <id>` it lists only the tiles attached to that catalog.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export const listTilesCommand = new Command('list-tiles')
  .description('List Fiori Launchpad tiles (CHIPs)')
  .option(
    '-c, --catalog <id>',
    'Restrict to tiles belonging to a specific catalog',
  )
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();
      const res = options.catalog
        ? await client.adt.flp.catalogs.tiles(options.catalog)
        : await client.adt.flp.tiles.list();
      const list = normalizeOdataFeed(res);

      if (options.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (list.length === 0) {
        console.log('📭 No FLP tiles found');
        return;
      }

      console.log(`🔲 Tiles (${list.length})`);
      for (const t of list) {
        console.log(`  • ${t.id ?? '(no id)'}`);
        if (t.title) console.log(`      ${t.title}`);
        if (t.description) console.log(`      ${t.description}`);
      }
    } catch (error) {
      console.error(
        '❌ Listing FLP tiles failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
