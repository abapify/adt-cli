/**
 * `adt flp list-groups` — list Fiori Launchpad groups / pages.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export const listGroupsCommand = new Command('list-groups')
  .description('List Fiori Launchpad groups (Page Builder "Pages")')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();
      const res = await client.adt.flp.groups.list();
      const list = normalizeOdataFeed(res);

      if (options.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (list.length === 0) {
        console.log('📭 No FLP groups found');
        return;
      }

      console.log(`📂 Groups (${list.length})`);
      for (const g of list) {
        console.log(`  • ${g.id ?? '(no id)'}`);
        if (g.title) console.log(`      ${g.title}`);
        if (g.catalogId) console.log(`      catalog: ${g.catalogId}`);
        if (g.chipInstanceCount)
          console.log(`      tiles: ${g.chipInstanceCount}`);
      }
    } catch (error) {
      console.error(
        '❌ Listing FLP groups failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
