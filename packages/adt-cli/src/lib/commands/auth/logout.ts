import { Command } from 'commander';
import { AuthManager, FileStorage } from '@abapify/adt-auth';
import { handleCommandError } from '../../utils/command-helpers';
import { getDefaultSid } from '../../utils/auth';

export const logoutCommand = new Command('logout')
  .description('Logout from ADT')
  .option(
    '--sid <sid>',
    'System ID to logout from (defaults to current default)',
  )
  .action(async (options) => {
    try {
      const sid = options.sid || getDefaultSid();

      if (!sid) {
        console.log('❌ No active session to logout from');
        process.exit(1);
      }

      const storage = new FileStorage();
      const authManager = new AuthManager(storage);
      authManager.deleteSession(sid);

      console.log(`✅ Successfully logged out from ${sid}!`);
    } catch (error) {
      handleCommandError(error, 'Logout');
    }
  });
