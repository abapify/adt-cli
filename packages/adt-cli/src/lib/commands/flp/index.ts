/**
 * `adt flp` — Fiori Launchpad inventory commands (E14, read-only v1).
 *
 * Subcommands:
 *   - list-catalogs           : list all FLP catalogs
 *   - list-groups             : list all FLP groups / pages
 *   - list-tiles [--catalog]  : list all FLP tiles (optionally by catalog)
 *   - get-tile <id>           : fetch a single FLP tile by CHIP ID
 */

import { Command } from 'commander';
import { listCatalogsCommand } from './list-catalogs';
import { listGroupsCommand } from './list-groups';
import { listTilesCommand } from './list-tiles';
import { getTileCommand } from './get-tile';

export function createFlpCommand(): Command {
  const cmd = new Command('flp').description(
    'Fiori Launchpad (FLP) inventory commands — read-only',
  );
  cmd.addCommand(listCatalogsCommand);
  cmd.addCommand(listGroupsCommand);
  cmd.addCommand(listTilesCommand);
  cmd.addCommand(getTileCommand);
  return cmd;
}
