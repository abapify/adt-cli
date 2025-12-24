import { Command } from 'commander';
import { loadAuthSession, getDefaultSid } from '../../utils/auth';
import { handleCommandError } from '../../utils/command-helpers';

export const statusCommand = new Command('status')
  .description('Check authentication status')
  .option('--sid <sid>', 'System ID to check (defaults to current default)')
  .action(async (options) => {
    try {
      const sid = options.sid || getDefaultSid();

      if (!sid) {
        console.log('❌ Not authenticated');
        console.log('💡 Run "npx adt auth login" to login');
        process.exit(1);
      }

      // Try to load session
      const session = loadAuthSession(sid);

      if (!session) {
        console.log(`❌ Not authenticated for SID: ${sid}`);
        console.log(`💡 Run "npx adt auth login --sid=${sid}" to login`);
        process.exit(1);
      }

      console.log('✅ Authenticated');
      console.log('');

      // Show SID
      console.log(`🆔 System: ${sid}`);

      // Show host and client
      console.log(`🌐 Host: ${session.host}`);
      if (session.client) {
        console.log(`🔧 Client: ${session.client}`);
      }

      // Show auth method
      const authMethodDisplay =
        session.auth.method === 'cookie'
          ? 'Cookie (Browser SSO)'
          : 'Basic Auth';
      console.log(`🔐 Auth Method: ${authMethodDisplay}`);

      // Show plugin if available
      if (session.auth.plugin) {
        console.log(`🔌 Plugin: ${session.auth.plugin}`);
      }

      // Show credentials info based on method
      if (
        session.auth.method === 'basic' &&
        'username' in session.auth.credentials
      ) {
        console.log(`👤 User: ${session.auth.credentials.username}`);
      } else if (
        session.auth.method === 'cookie' &&
        'expiresAt' in session.auth.credentials
      ) {
        // Show token expiration for cookie auth
        const expiresAt = new Date(session.auth.credentials.expiresAt);
        const now = new Date();
        const isExpired = expiresAt <= now;

        console.log('');
        console.log('⏱️  Session Status:');

        if (isExpired) {
          console.log(
            '   Status: ⚠️  Expired (re-authenticate with "npx adt auth login")',
          );
          console.log(`   Expired: ${formatDate(expiresAt)}`);
        } else {
          const timeLeft = expiresAt.getTime() - now.getTime();
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutesLeft = Math.floor(
            (timeLeft % (1000 * 60 * 60)) / (1000 * 60),
          );

          console.log(`   Status: ✅ Valid`);
          console.log(`   Expires: ${formatDate(expiresAt)}`);
          console.log(`   Time left: ${hoursLeft}h ${minutesLeft}m`);
        }
      }
    } catch (error) {
      handleCommandError(error, 'Status');
    }
  });

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
