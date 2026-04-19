/**
 * Top-level `adt strust` command — wires subcommands together.
 */

import { Command } from 'commander';
import { strustListCommand } from './list';
import { strustGetCommand } from './get';
import { strustPutCommand } from './put';
import { strustDeleteCommand } from './delete';

export const strustCommand = new Command('strust')
  .description(
    'STRUST SSL certificate management (Personal Security Environments)',
  )
  .addCommand(strustListCommand)
  .addCommand(strustGetCommand)
  .addCommand(strustPutCommand)
  .addCommand(strustDeleteCommand);
