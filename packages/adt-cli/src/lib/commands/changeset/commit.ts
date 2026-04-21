/**
 * `adt changeset commit` — batch-activate every staged object, release
 * locks, and remove the on-disk state file on success.
 */

import { Command } from 'commander';
import { ChangesetService } from '../../services/changeset';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { deleteChangeset, loadChangeset, saveChangeset } from './state';

export const changesetCommitCommand = new Command('commit')
  .description('Batch-activate every staged object and release locks')
  .requiredOption('--changeset <id>', 'Changeset id')
  .option(
    '-s, --system <systemId>',
    'Logical system bucket for on-disk state',
    'default',
  )
  .option('--json', 'Emit the commit result as JSON', false)
  .action(async (options) => {
    try {
      const cs = loadChangeset(options.system, options.changeset);
      const client = await getAdtClientV2();
      const service = new ChangesetService(client);

      try {
        const result = await service.commit(cs);
        deleteChangeset(options.system, cs.id);

        if (options.json) {
          console.log(JSON.stringify({ changeset: cs, result }, null, 2));
        } else {
          console.log(`✅ Changeset ${cs.id} committed`);
          console.log(`   activated: ${result.activated.length}`);
          for (const uri of result.activated) console.log(`     • ${uri}`);
          if (result.failed.length > 0) {
            console.log(`   failed: ${result.failed.length}`);
            for (const f of result.failed)
              console.log(`     ✗ ${f.uri}: ${f.error}`);
          }
        }
      } catch (err) {
        // Persist the mutated status so the user can see where we stopped.
        saveChangeset(options.system, cs);
        throw err;
      }
    } catch (error) {
      console.error(
        '❌ changeset commit failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
