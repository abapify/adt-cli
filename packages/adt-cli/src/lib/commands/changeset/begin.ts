/**
 * `adt changeset begin` — open a new transactional changeset and persist
 * it to `~/.adt/changesets/<systemId>/<id>.json`. Subsequent `add` /
 * `commit` / `rollback` commands take `--changeset <id>`.
 */

import { Command } from 'commander';
import { ChangesetService } from '../../services/changeset';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { saveChangeset } from './state';

export const changesetBeginCommand = new Command('begin')
  .description('Open a new transactional changeset')
  .option('-d, --description <text>', 'Optional description')
  .option(
    '-s, --system <systemId>',
    'Logical system bucket for on-disk state',
    'default',
  )
  .option('--json', 'Emit the changeset as JSON', false)
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();
      const service = new ChangesetService(client);
      const cs = service.begin(options.description);
      saveChangeset(options.system, cs);

      if (options.json) {
        console.log(JSON.stringify(cs, null, 2));
      } else {
        console.log(`✅ Changeset opened: ${cs.id}`);
        console.log(`   status: ${cs.status}`);
        if (cs.description) console.log(`   description: ${cs.description}`);
        console.log(
          `\n💡 Next: adt changeset add --changeset ${cs.id} --object-name … --object-type … --source-file …`,
        );
      }
    } catch (error) {
      console.error(
        '❌ changeset begin failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
