import { Command } from 'commander';
import { setDefaultSid, listAvailableSids } from '../../utils/auth';

export const setDefaultCommand = new Command('set-default')
  .description('Set the default SAP system')
  .argument('<sid>', 'System ID to set as default (e.g., BHF, S0D)')
  .action(async (sid: string) => {
    try {
      // Validate SID exists
      const availableSids = listAvailableSids();
      const upperSid = sid.toUpperCase();

      if (!availableSids.includes(upperSid)) {
        console.error(`❌ System ${upperSid} not found.`);
        console.error(
          `\nAvailable systems: ${availableSids.join(', ') || 'none'}`,
        );
        console.error(`💡 Run "npx adt auth login --sid=${upperSid}" first`);
        process.exit(1);
      }

      // Set as default
      setDefaultSid(upperSid);
      console.log(`✅ Default system set to: ${upperSid}`);
    } catch (error) {
      console.error(
        '❌ Failed to set default system:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
