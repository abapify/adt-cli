/**
 * `adt changeset rollback` — release every lock held by the changeset
 * and remove the on-disk state file. Does NOT revert PUT'ed source
 * (SAP has no transactional discard — see service docs).
 */

import { Command } from 'commander';
import { ChangesetService } from '../../services/changeset';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { deleteChangeset, loadChangeset } from './state';

export const changesetRollbackCommand = new Command('rollback')
  .description('Release locks held by a changeset (source PUTs not reverted)')
  .requiredOption('--changeset <id>', 'Changeset id')
  .option(
    '-s, --system <systemId>',
    'Logical system bucket for on-disk state',
    'default',
  )
  .option('--json', 'Emit the rollback result as JSON', false)
  .action(async (options) => {
    try {
      const cs = loadChangeset(options.system, options.changeset);
      const client = await getAdtClientV2();
      const service = new ChangesetService(client);

      const result = await service.rollback(cs);
      deleteChangeset(options.system, cs.id);

      if (options.json) {
        console.log(JSON.stringify({ changeset: cs, result }, null, 2));
      } else {
        console.log(`✅ Changeset ${cs.id} rolled back`);
        console.log(`   released: ${result.released.length}`);
        for (const uri of result.released) console.log(`     • ${uri}`);
        if (result.failed.length > 0) {
          console.log(`   failed: ${result.failed.length}`);
          for (const f of result.failed)
            console.log(`     ✗ ${f.uri}: ${f.error}`);
        }
      }
    } catch (error) {
      console.error(
        '❌ changeset rollback failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
