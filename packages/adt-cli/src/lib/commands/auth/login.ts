import { Command } from 'commander';
import { input, select, password } from '@inquirer/prompts';
import { readServiceKey } from '@abapify/adt-auth';
import {
  setDefaultSid,
  getDefaultSid,
  listAvailableSids,
  getAuthManager,
} from '../../utils/auth';
import { handleCommandError } from '../../utils/command-helpers';
import { asText } from '../../utils/text';
import { verifyBasicAuth } from '../../utils/verify-basic-auth';
import {
  CALLBACK_SERVER_PORT,
  OAUTH_REDIRECT_URI,
  OAUTH_TIMEOUT_MS,
} from '../../config';
import {
  listDestinations,
  getDestination,
  getConfig,
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

type LoginCommandOptions = {
  serviceKey?: string;
  redirectUri?: string;
  insecure?: boolean;
  skipVerify?: boolean;
  sid?: string;
};

type LoginSession = Awaited<
  ReturnType<ReturnType<typeof getAuthManager>['login']>
>;

/** Pick the effective global redirect URI from the loaded config. */
function resolveGlobalRedirectUri(config: {
  raw: { redirectUri?: unknown };
}): string | undefined {
  const value = config.raw.redirectUri;
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

/** Handle login failure; user cancellation exits quietly with code 1. */
function reportLoginFailure(error: unknown): never {
  // Handle user cancellation (Ctrl+C)
  if ((error as any).name === 'ExitPromptError') {
    console.log('\n❌ Login cancelled');
    process.exit(1);
  }
  handleCommandError(error, 'Login');
}

/** Print the login success banner and the default-SID note. */
function printLoginSuccess(session: LoginSession, sid: string): void {
  console.log(`\n✅ Successfully logged in!`);
  console.log(`   System: ${session.sid}`);
  console.log(`   Host: ${session.host}`);
  console.log(`   Method: ${session.auth.method}`);
  console.log(`   💡 ${sid} set as default system`);
}

/** Service-key login flow (--service-key). */
async function loginWithServiceKey(
  serviceKeyPath: string,
  sidArg: string,
  options: LoginCommandOptions,
  globalRedirectUri: string | undefined,
): Promise<void> {
  const serviceKey = readServiceKey(serviceKeyPath);
  if (!serviceKey.systemid && !sidArg) {
    throw new Error(
      'Service key does not contain a systemid. Use --sid to specify the system ID.',
    );
  }

  const sid = sidArg || serviceKey.systemid.toUpperCase();
  const authManager = getAuthManager();
  const openModule = await import('open');
  const openFn = openModule.default;

  const session = await authManager.login(sid, {
    type: '@abapify/adt-auth/plugins/service-key',
    options: {
      url: serviceKey.url,
      serviceKey,
      openBrowser: async (url: string) => {
        try {
          console.log('🌐 Opening browser for authentication...');
          await openFn(url);
        } catch {
          console.log('🌐 Open this URL in your browser to authenticate:');
          console.log(url);
        }
      },
      callbackPort: CALLBACK_SERVER_PORT,
      redirectUri:
        (options.redirectUri as string | undefined) ??
        globalRedirectUri ??
        OAUTH_REDIRECT_URI,
      timeoutMs: OAUTH_TIMEOUT_MS,
    },
  });

  setDefaultSid(sid);
  printLoginSuccess(session, sid);
}

/**
 * Configured-destination login flow (--sid matching a destination).
 * Prompts for credentials when a basic-auth destination lacks them.
 */
async function loginWithDestination(
  sid: string,
  dest: Destination,
  options: LoginCommandOptions,
  globalRedirectUri: string | undefined,
): Promise<void> {
  console.log(`📋 Authenticating to ${sid}...\n`);

  // For basic auth without credentials, prompt for username/password
  const destOptions = dest.options as DestinationOptions;
  if (
    isBasicAuthPlugin(dest.type) &&
    (!destOptions.username || !destOptions.password)
  ) {
    const credentials = await promptForBasicAuthCredentials(
      destOptions.url,
      options,
    );
    Object.assign(destOptions, credentials);
  }

  const authManager = getAuthManager();
  const resolvedDestOptions = withGlobalRedirectUri(
    destOptions,
    globalRedirectUri,
  );
  await verifyBasicCredentials(dest.type, resolvedDestOptions, {
    skipVerify: options.skipVerify === true,
    insecure: options.insecure === true,
  });
  const session = await authManager.login(sid, {
    type: dest.type,
    options: resolvedDestOptions,
  });

  // Set as default
  setDefaultSid(sid);
  printLoginSuccess(session, sid);
}

/**
 * Interactive destination selection flow (no --sid).
 * Returns true when a destination was selected and the login completed;
 * false when the user chose manual configuration.
 */
async function loginViaDestinationSelection(
  configuredDestinations: string[],
  options: LoginCommandOptions,
  globalRedirectUri: string | undefined,
): Promise<boolean> {
  const destinationChoices: DestinationChoice[] = [];

  const destinations = await Promise.all(
    configuredDestinations.map((destName) => getDestination(destName)),
  );
  for (const [index, destName] of configuredDestinations.entries()) {
    const dest = destinations[index];
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

  if (!selected.destination) return false;

  const sid = selected.sid;
  console.log(`\n📋 Authenticating to ${sid}...\n`);

  const authManager = getAuthManager();
  const destOptions = selected.destination.options as DestinationOptions;
  if (
    isBasicAuthPlugin(selected.destination.type) &&
    (!destOptions.username || !destOptions.password)
  ) {
    const credentials = await promptForBasicAuthCredentials(
      destOptions.url,
      options,
    );
    Object.assign(destOptions, credentials);
  }
  const resolvedDestOptions = withGlobalRedirectUri(
    destOptions,
    globalRedirectUri,
  );
  await verifyBasicCredentials(selected.destination.type, resolvedDestOptions, {
    skipVerify: options.skipVerify === true,
    insecure: options.insecure === true,
  });
  const session = await authManager.login(sid, {
    type: selected.destination.type,
    options: resolvedDestOptions,
  });

  // Set as default
  setDefaultSid(sid);
  printLoginSuccess(session, sid);
  return true;
}

/** Manual configuration flow (built-in basic auth only). */
async function loginManually(
  initialSid: string,
  options: LoginCommandOptions,
): Promise<void> {
  // Manual flow: collect URL and credentials (built-in basic auth only)
  const manualConfig = await promptManualConfig();

  // Get or prompt for SID
  let sid = initialSid;
  if (!sid) {
    sid = options.sid?.toUpperCase() || (await promptForSid());
  }

  // Collect credentials for basic auth
  const pluginOptions = await collectPluginOptions(manualConfig.url, options);

  // Authenticate via AuthManager (always uses built-in basic auth for manual flow)
  console.log(`\n📋 Authenticating to ${sid}...\n`);
  const authManager = getAuthManager();
  await verifyBasicCredentials(manualConfig.pluginType, pluginOptions, {
    skipVerify: options.skipVerify === true,
    insecure: options.insecure === true,
  });
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
}

export const loginCommand = new Command('login')
  .description('Login to ADT - supports Basic Auth and Browser-based SSO')
  .option(
    '--service-key <path>',
    'Path to a BTP service key JSON file for service-key login',
  )
  .option(
    '--redirect-uri <uri>',
    'OAuth callback redirect URI (e.g. Codespaces/tunnel URL)',
  )
  .option(
    '--insecure',
    'Allow insecure SSL connections (ignore certificate errors)',
  )
  .option(
    '--skip-verify',
    'Skip credential verification against the SAP system (offline logins)',
  )
  .action(async function (this: Command, options) {
    try {
      // Get SID from global options (--sid is a global option on root program)
      const globalOpts = this.optsWithGlobals();
      const sidArg = globalOpts.sid?.toUpperCase() || '';
      const config = await getConfig();
      const globalRedirectUri = resolveGlobalRedirectUri(config);

      console.log('🔐 ADT Login\n');

      if (options.serviceKey) {
        await loginWithServiceKey(
          options.serviceKey as string,
          sidArg,
          options,
          globalRedirectUri,
        );
        return;
      }

      // Check if we have configured destinations
      const configuredDestinations = await listDestinations();

      const sid: string = sidArg;

      // If --sid provided and destination exists in config, use it directly
      // Case-insensitive match
      const matchedSid = configuredDestinations.find(
        (d) => d.toUpperCase() === sid,
      );
      if (sid && matchedSid) {
        const dest = await getDestination(matchedSid);
        if (dest) {
          await loginWithDestination(sid, dest, options, globalRedirectUri);
          return;
        }
      }

      // If --sid was explicitly provided but not found, do not fall back to interactive mode.
      if (sid && !matchedSid) {
        throw new Error(
          configuredDestinations.length > 0
            ? `Destination ${sid} not found. Available destinations: ${configuredDestinations.join(', ')}`
            : `Destination ${sid} not found. No destinations are configured.`,
        );
      }

      // If destinations configured but no --sid, show selection
      if (configuredDestinations.length > 0) {
        const handled = await loginViaDestinationSelection(
          configuredDestinations,
          options,
          globalRedirectUri,
        );
        if (handled) return;
      }

      // Manual flow
      await loginManually(sid, options);
    } catch (error) {
      reportLoginFailure(error);
    }
  });

/** Plugin ids that perform basic auth (canonical path and export alias). */
const BASIC_AUTH_PLUGINS = new Set([
  '@abapify/adt-auth/plugins/basic',
  '@abapify/adt-auth/basic',
]);

function isBasicAuthPlugin(pluginType: string): boolean {
  return BASIC_AUTH_PLUGINS.has(pluginType);
}

/**
 * Verify basic-auth credentials against the SAP system before the session
 * is persisted. The basic plugin itself never contacts SAP, so without
 * this check login would report success for wrong credentials (#289).
 */
async function verifyBasicCredentials(
  pluginType: string,
  destOptions: DestinationOptions,
  verifyOptions: { skipVerify: boolean; insecure: boolean },
): Promise<void> {
  if (!isBasicAuthPlugin(pluginType)) {
    return; // cookie/SSO plugins already authenticate interactively
  }

  if (verifyOptions.skipVerify) {
    console.log('⚠️  Skipping credential verification (--skip-verify)');
    return;
  }

  if (!destOptions.username || !destOptions.password) {
    throw new Error(
      'Basic-auth destination is missing username or password. ' +
        'Update the destination configuration or use --skip-verify to bypass.',
    );
  }

  if (destOptions.url.startsWith('http://')) {
    console.log(
      '⚠️  Destination uses plain HTTP — credentials are sent unencrypted.',
    );
  }

  console.log('🔑 Verifying credentials against the SAP system...');
  await verifyBasicAuth({
    url: destOptions.url,
    client:
      destOptions.client === undefined || destOptions.client === null
        ? undefined
        : asText(destOptions.client),
    username: asText(destOptions.username),
    password: asText(destOptions.password),
    insecure: verifyOptions.insecure,
  });
  console.log('✅ Credentials accepted');
}

async function promptForSid(): Promise<string> {
  const sid = await input({
    message: 'System ID (e.g., TRL)',
    validate: (value) => {
      if (!value) return 'SID is required';
      if (!/^[A-Z0-9]{3}$/.test(value.toUpperCase())) {
        return 'SID must be 3 alphanumeric characters (e.g., TRL)';
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
 * Prompt for basic auth credentials only (used when destination in config lacks credentials)
 */
async function promptForBasicAuthCredentials(
  url: string,
  commandOptions: any,
): Promise<{ username: string; password: string; client?: string }> {
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

function withGlobalRedirectUri(
  options: DestinationOptions,
  globalRedirectUri?: string,
): DestinationOptions {
  if (!globalRedirectUri || options.redirectUri) {
    return options;
  }

  return {
    ...options,
    redirectUri: globalRedirectUri,
  };
}
