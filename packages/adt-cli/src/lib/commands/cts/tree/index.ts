/**
 * adt cts tree - Transport tree commands using search configuration
 *
 * Commands:
 * - adt cts tree           - List transports using search configuration
 * - adt cts tree config    - View current search configuration
 */

import { Command } from 'commander';
import { treeListCommand } from './list';
import { treeConfigCommand } from './config';

export function createTreeCommand(): Command {
  const treeCmd = new Command('tree').description(
    'Transport tree operations (uses search configuration)',
  );

  // Default action - list transports
  treeCmd.addCommand(treeListCommand, { isDefault: true });
  treeCmd.addCommand(treeConfigCommand);

  return treeCmd;
}
