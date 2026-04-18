/**
 * adt function - Function Group + Function Module commands
 */

import { Command } from 'commander';
import { functionGroupCommand } from './group';
import { functionModuleCommand } from './module';

export const functionCommand = new Command('function').description(
  'ABAP function group and function module operations',
);

functionCommand.addCommand(functionGroupCommand);
functionCommand.addCommand(functionModuleCommand);
