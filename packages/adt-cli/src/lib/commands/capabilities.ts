import { Command } from 'commander';
import { assertRuntimeModules } from '../capabilities';
import { collectInstalledCapabilities } from '../installed-capabilities';

export const capabilitiesCommand = new Command('capabilities')
  .description(
    'Report installed runtime capabilities as versioned JSON (identity, formats, configured modules)',
  )
  .action(async () => {
    try {
      const report = await collectInstalledCapabilities();
      assertRuntimeModules(report);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`adt capabilities: ${message}\n`);
      process.exitCode = 1;
    }
  });
