import { Command } from 'commander';
import { input, select, password } from '@inquirer/prompts';
import {
  setDefaultSid,
  getDefaultSid,
  listAvailableSids,
  getAuthManager,
} from '../../utils/auth';
import { handleCommandError } from '../../utils/command-helpers';
import {
  listDestinations,
  getDestination,
  type Destination,
} from '../../utils/destinations';

interface DestinationOptions {
  url: string;
  [key: string]: unknown;
}

interface DestinationChoice {
  name: string;
  value: { sid: string; destination: Destination | null };
  description: string;
}

export const loginCommand = new Command('login')
  .description('Login to ADT - supports Basic Auth and Browser-based SSO')
  .option(
    '--insecure',
    'Allow insecure SSL connections (ignore certificate errors)',
  )
  .action(async function (this: Command, options) {
    try {
      // Get SID from global options (--sid is a global option on root program)
      const globalOpts = this.optsWithGlobals();
      const sidArg = globalOpts.sid?.toUpperCase() || '';

      console.log('🔐 ADT Login\n');

      // Check if we have configured destinations
      const configuredDestinations = await listDestinations();

      let sid: string = sidArg;

      // If --sid provided and destination exists in config, use it directly
      // Case-insensitive match
      const matchedSid = configuredDestinations.find(
        (d) => d.toUpperCase() === sid,
      );
      if (sid && matchedSid) {
        const dest = await getDestination(matchedSid);
        if (dest) {
          console.log(`📋 Authenticating to ${sid}...\n`);

          const authManager = getAuthManager();
          const session = await authManager.login(sid, {
            type: dest.type,
            options: dest.options as DestinationOptions,
          });

          // Set as default
          setDefaultSid(sid);

          console.log(`\n✅ Successfully logged in!`);
          console.log(`   System: ${session.sid}`);
          console.log(`   Host: ${session.host}`);
          console.log(`   Method: ${session.auth.method}`);
          console.log(`   💡 ${sid} set as default system`);

          return;
        }
      }

      // If destinations configured but no --sid, show selection
      if (configuredDestinations.length > 0) {
        const destinationChoices: DestinationChoice[] = [];

        for (const destName of configuredDestinations) {
          const dest = await getDestination(destName);
          if (dest) {
            const opts = dest.options as DestinationOptions;
            destinationChoices.push({
              name: `${destName} (${opts.url}) [${dest.type}]`,
              value: { sid: destName, destination: dest },
              description: `${dest.type} authentication`,
            });
          }
        }

        // Add manual option
        destinationChoices.push({
          name: '➕ Manual configuration...',
          value: { sid: '', destination: null as unknown as Destination },
          description: 'Enter URL and auth method manually',
        });

        const selected = await select({
          message: 'Select destination',
          choices: destinationChoices,
        });

        if (selected.destination) {
          sid = selected.sid;
          console.log(`\n📋 Authenticating to ${sid}...\n`);

          const authManager = getAuthManager();
          const session = await authManager.login(sid, {
            type: selected.destination.type,
            options: selected.destination.options as DestinationOptions,
          });

          // Set as default
          setDefaultSid(sid);

          console.log(`\n✅ Successfully logged in!`);
          console.log(`   System: ${session.sid}`);
          console.log(`   Host: ${session.host}`);
          console.log(`   Method: ${session.auth.method}`);
          console.log(`   💡 ${sid} set as default system`);

          return;
        }
      }

      // Manual flow: collect URL and credentials (built-in basic auth only)
      const manualConfig = await promptManualConfig();

      // Get or prompt for SID
      if (!sid) {
        sid = options.sid?.toUpperCase() || (await promptForSid());
      }

      // Collect credentials for basic auth
      const pluginOptions = await collectPluginOptions(
        manualConfig.url,
        options,
      );

      // Authenticate via AuthManager (always uses built-in basic auth for manual flow)
      console.log(`\n📋 Authenticating to ${sid}...\n`);
      const authManager = getAuthManager();
      const session = await authManager.login(sid, {
        type: manualConfig.pluginType,
        options: pluginOptions,
      });

      console.log(`\n✅ Successfully logged in!`);
      console.log(`   System: ${session.sid}`);
      console.log(`   Host: ${session.host}`);
      console.log(`   Method: ${session.auth.method}`);

      // Set as default if it's the first system
      const availableSids = listAvailableSids();
      if (availableSids.length === 1 || !getDefaultSid()) {
        setDefaultSid(sid);
        console.log(`💡 ${sid} set as default system`);
      } else {
        console.log(
          `\n💡 Run "npx adt auth set-default ${sid}" to make it the default system`,
        );
      }
    } catch (error) {
      // Handle user cancellation (Ctrl+C)
      if ((error as any).name === 'ExitPromptError') {
        console.log('\n❌ Login cancelled');
        process.exit(1);
      }
      handleCommandError(error, 'Login');
    }
  });

async function promptForSid(): Promise<string> {
  const sid = await input({
    message: 'System ID (e.g., BHF, S0D)',
    validate: (value) => {
      if (!value) return 'SID is required';
      if (!/^[A-Z0-9]{3}$/.test(value.toUpperCase())) {
        return 'SID must be 3 alphanumeric characters (e.g., BHF, S0D)';
      }
      return true;
    },
  });
  return sid.toUpperCase();
}

/**
 * Collect authentication options for manual flow
 * (Only built-in basic auth supported in manual mode - other plugins require adt.config.ts)
 */
async function collectPluginOptions(
  url: string,
  commandOptions: any,
): Promise<DestinationOptions> {
  const client = await input({
    message: 'Client (optional, e.g., 100)',
    default: '',
  });

  const username = await input({
    message: 'Username',
    validate: (value) => (value ? true : 'Username is required'),
  });

  const userPassword = await password({
    message: 'Password',
    validate: (value) => (value ? true : 'Password is required'),
  });

  if (commandOptions.insecure) {
    console.log('⚠️  SSL certificate verification disabled\n');
  }

  return {
    url,
    client: client || undefined,
    username,
    password: userPassword,
  };
}

/**
 * Prompt for manual configuration (no adt.config.ts)
 */
async function promptManualConfig(): Promise<{
  pluginType: string;
  url: string;
}> {
  // Step 1: Choose authentication method (built-in plugins only)
  const pluginType = await select({
    message: 'Authentication method',
    choices: [
      {
        name: 'Basic Authentication (username/password)',
        value: '@abapify/adt-auth/plugins/basic',
        description: 'Standard username and password authentication',
      },
    ],
  });

  console.log('');

  // Step 2: Collect URL
  let url = await input({
    message: 'SAP System URL (e.g., https://host:port or host:port)',
    validate: (value) => {
      if (!value) return 'URL is required';
      try {
        new URL(value.includes('://') ? value : `https://${value}`);
        return true;
      } catch {
        return 'Please enter a valid URL or hostname';
      }
    },
  });

  // Normalize URL
  if (!url.includes('://')) {
    url = `https://${url}`;
  }

  return { pluginType, url };
}
