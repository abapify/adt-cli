/**
 * ABAP Commands
 *
 * Subcommands for executing ABAP code:
 * - adt abap run <file>|-   - Execute ABAP snippet
 */

import { Command } from 'commander';
import { abapRunCommand } from './run';

export { abapRunCommand };

export function createAbapCommand(): Command {
  const cmd = new Command('abap').description('ABAP code execution commands');

  cmd.addCommand(abapRunCommand);

  return cmd;
}
