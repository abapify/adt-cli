import { Command } from 'commander';
import { createAdtProxy } from '@abapify/adt-proxy';
import { loadAuthSession } from '../utils/auth';

type AdtProxy = ReturnType<typeof createAdtProxy>;

type ProxyAuth = { username: string; password: string; client?: string };

type ProxyTarget = {
  targetUrl: string | undefined;
  auth?: ProxyAuth;
  defaultHeaders: Record<string, string>;
};

/**
 * Resolve the target URL and credentials from the current auth session.
 * Exits the process when not authenticated and no --target is given.
 */
function resolveTargetFromSession(sid: string | undefined): ProxyTarget {
  const session = loadAuthSession(sid);
  if (!session?.auth) {
    console.error('❌ Not authenticated and no --target specified');
    console.error('💡 Run "bunx adt auth login" or provide --target <url>');
    process.exit(1);
  }

  const defaultHeaders: Record<string, string> = {};
  let auth: ProxyAuth | undefined;

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
      defaultHeaders.authorization = rawCookies.substring(AUTH_PREFIX.length);
    } else {
      defaultHeaders.cookie = rawCookies;
    }
  }

  return { targetUrl: session.host, auth, defaultHeaders };
}

/** Print the proxy startup banner. */
function printProxyBanner(
  options: {
    port?: number;
    host?: string;
    convert?: boolean;
    forwardUnknown?: boolean;
  },
  targetUrl: string,
): void {
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
}

/** Print the bound address, first routes, and usage hints after startup. */
function printProxyStarted(
  options: { host?: string },
  port: number,
  routes: AdtProxy['routes'],
): void {
  console.log(`✅ ADT proxy running on http://${options.host}:${port}`);
  console.log(`\n📋 Available routes (${routes.length} from ADT contracts):`);
  for (const route of routes.slice(0, 10)) {
    console.log(`   ${route.method.padEnd(7)} ${route.pathTemplate}`);
  }
  if (routes.length > 10) {
    console.log(`   ... and ${routes.length - 10} more`);
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
}

export const proxyCommand = new Command('proxy')
  .description('Start an ADT proxy server with JSON↔XML conversion')
  .option(
    '-p, --port <port>',
    'Port to listen on (default: random available port)',
    (val: string) => {
      const parsed = Number.parseInt(val, 10);
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
  .option(
    '--max-body-size <bytes>',
    'Maximum request body size in bytes (default: 10485760)',
    (val: string) => {
      const parsed = Number.parseInt(val, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid max-body-size: ${val}`);
      }
      return parsed;
    },
  )
  .option('--sid <sid>', 'SAP System ID to use for authentication')
  .option('--verbose', 'Enable debug logging')
  .action(async (options, _command) => {
    try {
      // Determine target URL and auth
      const target: ProxyTarget = options.target
        ? { targetUrl: options.target, defaultHeaders: {} }
        : resolveTargetFromSession(options.sid);
      const { auth, defaultHeaders } = target;
      const targetUrl = target.targetUrl;

      if (!targetUrl) {
        console.error('❌ No target URL specified');
        process.exit(1);
      }

      printProxyBanner(options, targetUrl);

      const proxy = createAdtProxy({
        targetUrl,
        auth,
        defaultHeaders,
        port: options.port,
        host: options.host,
        basePath: options.basePath,
        convertContent: options.convert !== false,
        forwardUnknown: options.forwardUnknown !== false,
        maxBodySize: options.maxBodySize,
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

      printProxyStarted(options, port, proxy.routes);

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
