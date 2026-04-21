/**
 * Package Commands
 *
 * Subcommands:
 * - adt package get <name>              - Get package details (read-only)
 * - adt package create <name> <desc>    - Create a new package
 * - adt package list <name>             - List objects/subpackages
 * - adt package delete <name>           - Delete a package
 * - adt package activate <name...>      - Activate package(s)
 * - adt package stat <name>             - Check existence (exit 0=found, 10=not found)
 */

import { Command } from 'commander';
import { packageGetCommand } from './get';
import { packageCreateCommand } from './create';
import { packageListCommand } from './list';
import { packageDeleteCommand } from './delete';
import { packageActivateCommand } from './activate';
import { packageStatCommand } from './stat';

export function createPackageCommand(): Command {
  const pkgCmd = new Command('package').description('ABAP package operations');

  pkgCmd.addCommand(packageGetCommand);
  pkgCmd.addCommand(packageCreateCommand);
  pkgCmd.addCommand(packageListCommand);
  pkgCmd.addCommand(packageDeleteCommand);
  pkgCmd.addCommand(packageActivateCommand);
  pkgCmd.addCommand(packageStatCommand);

  return pkgCmd;
}
export { packageGetCommand } from './get';
export { packageCreateCommand } from './create';
export { packageListCommand } from './list';
export { packageDeleteCommand } from './delete';
export { packageActivateCommand } from './activate';
export { packageStatCommand } from './stat';
