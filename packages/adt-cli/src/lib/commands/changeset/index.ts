/**
 * `adt changeset …` command group.
 */

import { Command } from 'commander';
import { changesetBeginCommand } from './begin';
import { changesetAddCommand } from './add';
import { changesetCommitCommand } from './commit';
import { changesetRollbackCommand } from './rollback';

export function createChangesetCommand(): Command {
  const cmd = new Command('changeset').description(
    'Transactional unit-of-work — batch lock/PUT/activate (Wave 3)',
  );
  cmd.addCommand(changesetBeginCommand);
  cmd.addCommand(changesetAddCommand);
  cmd.addCommand(changesetCommitCommand);
  cmd.addCommand(changesetRollbackCommand);
  return cmd;
}

export {
  changesetBeginCommand,
  changesetAddCommand,
  changesetCommitCommand,
  changesetRollbackCommand,
};
