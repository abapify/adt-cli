/**
 * Datapreview Commands
 *
 * Subcommands for ABAP data preview (SQL console) operations:
 * - adt datapreview osql "<SELECT ...>"   - Execute ABAP Open SQL query
 */

import { Command } from 'commander';
import { datapreviewOsqlCommand } from './osql';

export function createDatapreviewCommand(): Command {
  const cmd = new Command('datapreview').description(
    'ABAP data preview (SQL console) operations',
  );

  cmd.addCommand(datapreviewOsqlCommand);

  return cmd;
}
export { datapreviewOsqlCommand } from './osql';
