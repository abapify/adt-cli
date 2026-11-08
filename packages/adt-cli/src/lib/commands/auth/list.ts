import { Command } from 'commander';
import { listAvailableSids, getDefaultSid } from '../../utils/auth';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List all authenticated SAP systems')
  .action(() => {
    try {
      const sids = listAvailableSids();
      const defaultSid = getDefaultSid();

      if (sids.length === 0) {
        console.log('📋 No authenticated systems found.');
        console.log('💡 Run "npx adt auth login --sid=<SID>" to add a system');
        return;
      }

      console.log('📋 Authenticated SAP Systems:\n');
      for (const sid of sids) {
        const isDefault = sid === defaultSid;
        const marker = isDefault ? '→' : ' ';
        const badge = isDefault ? ' (default)' : '';
        console.log(`${marker} ${sid}${badge}`);
      }

      console.log();
      if (defaultSid) {
        console.log(`Default system: ${defaultSid}`);
      } else {
        console.log('No default system set.');
        console.log('💡 Run "npx adt auth set-default <SID>" to set one');
      }
    } catch (error) {
      console.error(
        '❌ Failed to list systems:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
