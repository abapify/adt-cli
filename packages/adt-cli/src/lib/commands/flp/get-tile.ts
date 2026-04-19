/**
 * `adt flp get-tile <id>` — fetch a single FLP tile (CHIP) by ID.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { normalizeOdataEntity } from '@abapify/adt-contracts';

export const getTileCommand = new Command('get-tile')
  .description('Get a single Fiori Launchpad tile by ID')
  .argument('<id>', 'CHIP ID (e.g. X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER)')
  .option('--json', 'Output as JSON')
  .action(async (id: string, options) => {
    try {
      const client = await getAdtClientV2();
      const res = await client.adt.flp.tiles.get(id);
      const tile = normalizeOdataEntity(res);

      if (options.json) {
        console.log(JSON.stringify(tile ?? null, null, 2));
        return;
      }

      if (!tile) {
        console.log(`📭 Tile not found: ${id}`);
        return;
      }

      console.log(`🔲 ${tile.id ?? id}`);
      if (tile.title) console.log(`  Title:       ${tile.title}`);
      if (tile.description) console.log(`  Description: ${tile.description}`);
      if (tile.catalogId) console.log(`  Catalog:     ${tile.catalogId}`);
      if (tile.baseChipId) console.log(`  Base CHIP:   ${tile.baseChipId}`);
      if (tile.url) console.log(`  URL:         ${tile.url}`);
    } catch (error) {
      console.error(
        '❌ Fetching FLP tile failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
