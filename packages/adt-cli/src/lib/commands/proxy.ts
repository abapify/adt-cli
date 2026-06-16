import { Command } from 'commander';
import { createAdtProxy } from '@abapify/adt-proxy';
import { loadAuthSession, type AuthSession } from '../utils/auth';

export const proxyCommand = new Command('proxy')
  .description('Start an ADT proxy server with JSON↔XML conversion')
  .option(
    '-p, --port <port>',
    'Port to listen on (default: random available port)',
    (val: string) => {
      const parsed = parseInt(val, 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 65535) {
        throw new Error(`Invalid port: ${val}`);
      }
      return parsed;
    },
  )
  .option(
    '-H, --host <host>',
    'Host to bind to (default: 127.0.0.1)',
    '127.0.0.1',
  )
  .option(
    '-t, --target <url>',
    'Target SAP system URL (overrides current auth session)',
  )
  .option(
    '-b, --base-path <path>',
    'Base path prefix to strip from incoming requests',
    '',
  )
  .option(
    '--no-convert',
    'Disable JSON↔XML conversion (forward requests as-is)',
  )
  .option(
    '--no-forward-unknown',
    'Return 404 for unmatched routes instead of forwarding',
  )
  .option('--sid <sid>', 'SAP System ID to use for authentication')
  .action(async (options, _command) => {
    try {
      // Determine target URL and auth
      let targetUrl: string | undefined = options.target;
      let auth:
        | { username: string; password: string; client?: string }
        | undefined;
      let defaultHeaders: Record<string, string> = {};

      if (!targetUrl) {
        // Use current auth session
        const session = loadAuthSession(options.sid);
        if (!session || !session.auth) {
          console.error('❌ Not authenticated and no --target specified');
          console.error(
            '💡 Run "npx adt auth login" or provide --target <url>',
          );
          process.exit(1);
        }

        targetUrl = session.host;

        if (session.auth.method === 'basic') {
          const creds = session.auth.credentials as {
            username: string;
            password: string;
          };
          auth = {
            username: creds.username,
            password: creds.password,
            client: session.client,
          };
        } else if (session.auth.method === 'cookie') {
          const creds = session.auth.credentials as { cookies: string };
          const rawCookies = decodeURIComponent(creds.cookies);
          const AUTH_PREFIX = 'Authorization: ';
          if (rawCookies.startsWith(AUTH_PREFIX)) {
            defaultHeaders.authorization = rawCookies.substring(
              AUTH_PREFIX.length,
            );
          } else {
            defaultHeaders.cookie = rawCookies;
          }
        }
      }

      if (!targetUrl) {
        console.error('❌ No target URL specified');
        process.exit(1);
      }

      console.log('🔄 Starting ADT proxy server...\n');
      console.log(`   Target: ${targetUrl}`);
      console.log(`   Port: ${options.port || 'auto'}`);
      console.log(`   Host: ${options.host}`);
      console.log(
        `   JSON↔XML conversion: ${options.convert !== false ? 'enabled' : 'disabled'}`,
      );
      console.log(
        `   Forward unknown routes: ${options.forwardUnknown !== false ? 'yes' : 'no'}`,
      );
      console.log('');

      const proxy = createAdtProxy({
        targetUrl,
        auth,
        defaultHeaders,
        port: options.port,
        host: options.host,
        basePath: options.basePath,
        convertContent: options.convert !== false,
        forwardUnknown: options.forwardUnknown !== false,
        logger: {
          debug: (msg, obj) => {
            if (options.verbose) {
              console.log(`[DEBUG] ${msg}`, obj || '');
            }
          },
          info: (msg, obj) => {
            console.log(`[INFO] ${msg}`, obj || '');
          },
          warn: (msg, obj) => {
            console.warn(`[WARN] ${msg}`, obj || '');
          },
          error: (msg, obj) => {
            console.error(`[ERROR] ${msg}`, obj || '');
          },
        },
      });

      const { port } = await proxy.start();

      console.log(`✅ ADT proxy running on http://${options.host}:${port}`);
      console.log(
        `\n📋 Available routes (${proxy.routes.length} from ADT contracts):`,
      );
      for (const route of proxy.routes.slice(0, 10)) {
        console.log(`   ${route.method.padEnd(7)} ${route.pathTemplate}`);
      }
      if (proxy.routes.length > 10) {
        console.log(`   ... and ${proxy.routes.length - 10} more`);
      }
      console.log(
        '\n💡 Send requests to the proxy and they will be forwarded to the target SAP system.',
      );
      console.log(
        '   JSON request bodies are automatically converted to XML for downstream requests.',
      );
      console.log(
        '   XML response bodies are automatically converted to JSON for proxy responses.',
      );

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log('\n🔄 Shutting down proxy...');
        await proxy.stop();
        console.log('✅ Proxy stopped');
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      console.error(
        '❌ Proxy failed to start:',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      process.exit(1);
    }
  });
