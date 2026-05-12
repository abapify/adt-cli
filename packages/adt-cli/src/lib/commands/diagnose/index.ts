import { Command } from 'commander';
import { diagnoseDumpsCommand } from './dumps';
import { diagnoseTracesCommand } from './traces';

export function createDiagnoseCommand(): Command {
  const cmd = new Command('diagnose').description(
    'Runtime diagnostics (short dumps, traces)',
  );

  cmd.addCommand(diagnoseDumpsCommand);
  cmd.addCommand(diagnoseTracesCommand);

  return cmd;
}

export { diagnoseDumpsCommand, diagnoseTracesCommand };
