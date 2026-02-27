import { Command } from 'commander';
import {
  loadAuthSession,
  getDefaultSid,
  refreshCredentials,
} from '../../utils/auth';
import { handleCommandError } from '../../utils/command-helpers';

export const refreshCommand = new Command('refresh')
  .description(
    'Refresh authentication session (auto-falls back to interactive if needed)',
  )
  .option('--sid <sid>', 'System ID to refresh (defaults to current default)')
  .action(async (options) => {
    try {
      const sid = options.sid || getDefaultSid();

      if (!sid) {
        console.log('❌ No authentication session found');
        console.log('💡 Run "npx adt auth login" to login first');
        process.exit(1);
      }

      // Load existing session
      const session = loadAuthSession(sid);

      if (!session) {
        console.log(`❌ Not authenticated for SID: ${sid}`);
        console.log(`💡 Run "npx adt auth login --sid=${sid}" to login`);
        process.exit(1);
      }

      console.log(`🔄 Refreshing authentication for ${sid}...`);
      console.log('');

      // AuthManager will try silent refresh first, then fall back to interactive
      const updatedSession = await refreshCredentials(session);

      if (!updatedSession) {
        console.log('');
        console.log('❌ Authentication failed');
        console.log(`💡 Run "npx adt auth login --sid=${sid}" to try again`);
        process.exit(1);
      }

      console.log('');
      console.log('✅ Authentication refreshed successfully!');
      console.log(`   System: ${updatedSession.sid}`);
      console.log(`   Host: ${updatedSession.host}`);
      console.log(`   Method: ${updatedSession.auth.method}`);
      console.log('');
    } catch (error) {
      console.log('');
      handleCommandError(error, 'Refresh');
    }
  });
