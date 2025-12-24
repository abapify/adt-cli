/**
 * Transport Request (TR) Commands
 *
 * Subcommands for transport request operations:
 * - adt cts tr list         - List transports
 * - adt cts tr get <TR>     - Get transport details
 * - adt cts tr create       - Create new transport
 * - adt cts tr set <TR>     - Update transport (non-interactive)
 * - adt cts tr delete <TR>  - Delete transport (with confirmation)
 * - adt cts tr release <TR> - Release transport
 * - adt cts tr check <TR>   - Pre-release validation (TODO)
 */

import { Command } from 'commander';
import { ctsListCommand } from './list';
import { ctsGetCommand } from './get';
import { ctsCreateCommand } from './create';
import { ctsSetCommand } from './set';
import { ctsDeleteCommand } from './delete';
import { ctsReleaseCommand } from './release';

export function createTrCommand(): Command {
  const trCmd = new Command('tr').description('Transport request operations');

  trCmd.addCommand(ctsListCommand);
  trCmd.addCommand(ctsGetCommand);
  trCmd.addCommand(ctsCreateCommand);
  trCmd.addCommand(ctsSetCommand);
  trCmd.addCommand(ctsDeleteCommand);
  trCmd.addCommand(ctsReleaseCommand);
  // NOTE: ctsCheckCommand not yet implemented (check endpoint not available)

  return trCmd;
}
