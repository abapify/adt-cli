/**
 * `adt flp list-catalogs` — list Fiori Launchpad catalogs.
 *
 * Hits the Page Builder OData service (`/sap/opu/odata/UI2/
 * PAGE_BUILDER_PERS/Catalogs?$format=json`) via the typed contract
 * `client.adt.flp.catalogs.list()`. The v1 command is read-only.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export const listCatalogsCommand = new Command('list-catalogs')
  .description('List Fiori Launchpad catalogs')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();
      const res = await client.adt.flp.catalogs.list();
      const list = normalizeOdataFeed(res);

      if (options.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (list.length === 0) {
        console.log('📭 No FLP catalogs found');
        return;
      }

      console.log(`📚 Catalogs (${list.length})`);
      for (const c of list) {
        console.log(`  • ${c.id ?? '(no id)'}`);
        if (c.title) console.log(`      ${c.title}`);
        if (c.chipCount) console.log(`      tiles: ${c.chipCount}`);
      }
    } catch (error) {
      console.error(
        '❌ Listing FLP catalogs failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
