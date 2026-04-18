/**
 * `adt wb` — workbench navigation commands (E15).
 *
 * Subcommands:
 *   - where-used  : find all usages of an ABAP object
 *   - callers     : upward call hierarchy
 *   - callees     : downward call hierarchy
 *   - definition  : navigate to the definition of a symbol
 *   - outline     : structural outline of an object
 *
 * CLI + MCP parity: each subcommand is a thin wrapper over the same
 * ADT endpoint invoked by the corresponding MCP tool.
 */

import { Command } from 'commander';
import { whereUsedCommand } from './where-used';
import { callersCommand } from './callers';
import { calleesCommand } from './callees';
import { definitionCommand } from './definition';
import { outlineCommand } from './outline';

export function createWbCommand(): Command {
  const cmd = new Command('wb').description(
    'Workbench navigation (where-used, call-hierarchy, definition, outline)',
  );
  cmd.addCommand(whereUsedCommand);
  cmd.addCommand(callersCommand);
  cmd.addCommand(calleesCommand);
  cmd.addCommand(definitionCommand);
  cmd.addCommand(outlineCommand);
  return cmd;
}
