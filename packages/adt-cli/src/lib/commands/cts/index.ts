/**
 * CTS Commands - Change and Transport System
 *
 * Uses v2 client with adt-contracts for type-safe API access.
 *
 * Command Structure:
 * - adt cts search [options]          - Search transports (basic endpoint)
 * - adt cts tree [options]            - List transports using search configuration
 * - adt cts tr <subcommand>           - Transport request operations:
 *     - adt cts tr list               - List transports
 *     - adt cts tr get <TR>           - Get transport details
 *     - adt cts tr create             - Create new transport
 *     - adt cts tr release <TR>       - Release transport (TODO)
 *     - adt cts tr check <TR>         - Pre-release validation (TODO)
 */

import { Command } from 'commander';
import { ctsSearchCommand } from './search';
import { createTreeCommand } from './tree';
import { createTrCommand } from './tr';

export function createCtsCommand(): Command {
  const ctsCmd = new Command('cts').description(
    'CTS (Change and Transport System) operations',
  );

  ctsCmd.addCommand(ctsSearchCommand);
  ctsCmd.addCommand(createTreeCommand());
  ctsCmd.addCommand(createTrCommand());

  return ctsCmd;
}
