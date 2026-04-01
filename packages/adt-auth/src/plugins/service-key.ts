import { createServer, type Server } from 'node:http';
import { spawn } from 'node:child_process';
import { parse as parseUrl } from 'node:url';
import type { AuthPlugin, AuthPluginOptions, CookieAuthResult } from '../types';
import {
  ServiceKeyParser,
  type BTPServiceKey,
  type ServiceKeyPluginOptions,
} from '../types/service-key';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from '../utils/pkce';

const DEFAULT_PORT = 3000;
const DEFAULT_REDIRECT_PATH = '/callback';
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes
const MAX_PORT_RETRIES = 5; // Try up to 5 consecutive ports on EADDRINUSE

/**
 * Copy text to system clipboard (best-effort, never throws).
 * Tries platform-appropriate commands: pbcopy (macOS), clip.exe (WSL), xclip/xsel (Linux).
 */
async function copyToClipboard(text: string): Promise<void> {
  const candidates =
    process.platform === 'darwin'
      ? [['pbcopy']]
      : process.platform === 'win32'
        ? [['clip']]
        : [
            ['clip.exe'],
            ['xclip', '-selection', 'clipboard'],
            ['xsel', '--clipboard'],
          ];

  for (const [cmd, ...args] of candidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(cmd, args, {
          stdio: ['pipe', 'ignore', 'ignore'],
        });
        child.on('error', reject);
        child.on('close', (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`${cmd} exited with code ${code}`)),
        );
        child.stdin.write(text);
        child.stdin.end();
      });
      return;
    } catch {
      continue;
    }
  }
  throw new Error('No clipboard utility available');
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * Exchange an authorization code for tokens using the PKCE flow.
 */
async function exchangeCodeForToken(
  serviceKey: BTPServiceKey,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<OAuthTokenResponse> {
  const { clientid, clientsecret, url: uaaUrl } = serviceKey.uaa;
  const credentials = Buffer.from(`${clientid}:${clientsecret}`).toString(
    'base64',
  );

  const response = await fetch(`${uaaUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as OAuthTokenResponse;

  if (!data.access_token) {
    throw new Error('Token response missing access_token');
  }

  return data;
}

/**
 * Run the OAuth PKCE authorization code flow:
 * 1. Start local callback server
 * 2. Build XSUAA authorize URL with PKCE
 * 3. Open browser for user login
 * 4. Receive auth code via redirect
 * 5. Exchange code for user token
 */
async function performPkceFlow(
  serviceKey: BTPServiceKey,
  openBrowser: (url: string) => Promise<void>,
  port: number,
  timeoutMs: number,
  redirectUri?: string,
): Promise<OAuthTokenResponse> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const resolvedRedirectUri =
    redirectUri ?? `http://localhost:${port}${DEFAULT_REDIRECT_PATH}`;
  const callbackPath = (() => {
    try {
      const pathname = new URL(resolvedRedirectUri).pathname;
      return pathname && pathname.length > 0 ? pathname : '/';
    } catch {
      return DEFAULT_REDIRECT_PATH;
    }
  })();

  // Build XSUAA authorize URL
  const authUrl = new URL(`${serviceKey.uaa.url}/oauth/authorize`);
  authUrl.searchParams.set('client_id', serviceKey.uaa.clientid);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', resolvedRedirectUri);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'openid');

  return new Promise<OAuthTokenResponse>((resolve, reject) => {
    // eslint-disable-next-line prefer-const -- server must be declared before timeout but assigned after
    let server: Server;

    const timeout = setTimeout(() => {
      server?.close();
      reject(new Error('Authentication timed out'));
    }, timeoutMs);

    server = createServer(async (req, res) => {
      try {
        const url = parseUrl(req.url || '', true);

        if (url.pathname !== callbackPath) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const {
          code,
          state: returnedState,
          error,
          error_description,
        } = url.query;

        if (error) {
          const errorSuffix = error_description
            ? ` - ${error_description}`
            : '';
          throw new Error(`OAuth error: ${error}${errorSuffix}`);
        }

        if (returnedState !== state) {
          throw new Error('State mismatch - possible CSRF attack');
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        const tokenData = await exchangeCodeForToken(
          serviceKey,
          code as string,
          codeVerifier,
          resolvedRedirectUri,
        );

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<html><body style="font-family:Arial;text-align:center;padding:50px">' +
            '<h2>Authentication successful!</h2>' +
            '<p>You can close this window and return to the terminal.</p>' +
            '<script>setTimeout(()=>window.close(),2000)</script>' +
            '</body></html>',
        );

        clearTimeout(timeout);
        setTimeout(() => {
          server.close();
          resolve(tokenData);
        }, 500);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<html><body style="font-family:Arial;text-align:center;padding:50px">' +
            `<h2>Authentication failed</h2><p>${err instanceof Error ? err.message : String(err)}</p>` +
            '</body></html>',
        );

        clearTimeout(timeout);
        server.close(() => reject(err));
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.listen(port, () => {
      openBrowser(authUrl.toString()).catch((err) => {
        clearTimeout(timeout);
        server.close();
        reject(
          new Error('Could not open browser for authentication', {
            cause: err,
          }),
        );
      });
    });
  });
}

const authPlugin: AuthPlugin = {
  async authenticate(options: AuthPluginOptions): Promise<CookieAuthResult> {
    const { serviceKey, openBrowser, callbackPort, timeoutMs, redirectUri } =
      options as ServiceKeyPluginOptions;

    if (!serviceKey) {
      throw new Error('service-key plugin requires a serviceKey option');
    }

    const parsed = ServiceKeyParser.parse(serviceKey);

    // Resolve openBrowser: use provided callback, or dynamically import 'open'
    let browserOpener: (url: string) => Promise<void>;
    if (openBrowser) {
      browserOpener = openBrowser;
    } else {
      // Fallback: try dynamic import of 'open' package
      try {
        const openModule = await import('open');
        const openFn = openModule.default;
        browserOpener = async (url: string) => {
          await openFn(url);
        };
      } catch {
        throw new Error(
          'No openBrowser callback provided and "open" package not available. ' +
            'Install "open" or pass an openBrowser function in plugin options.',
        );
      }
    }

    const startPort =
      typeof callbackPort === 'number' ? callbackPort : DEFAULT_PORT;
    const timeout =
      typeof timeoutMs === 'number' ? timeoutMs : DEFAULT_TIMEOUT_MS;

    // Extract log from options (passed by AuthManager during refresh, or by CLI)
    const log = (options as { log?: (msg: string) => void }).log ?? console.log;

    // Wrap browser opener: always print the URL and try clipboard copy before opening
    const wrappedBrowserOpener = async (url: string) => {
      log(`🔗 Open this URL to authenticate:\n   ${url}`);

      try {
        await copyToClipboard(url);
        log('📋 URL copied to clipboard');
      } catch {
        // Clipboard not available — URL is already printed above
      }

      await browserOpener(url);
    };

    // Try ports starting from startPort, retrying on EADDRINUSE
    const hasExplicitRedirect = typeof redirectUri === 'string';
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_PORT_RETRIES; attempt++) {
      const port = startPort + attempt;
      // When redirectUri is explicitly set, use it as-is (don't rewrite for new port)
      const effectiveRedirectUri = hasExplicitRedirect
        ? redirectUri
        : undefined;

      try {
        const tokenData = await performPkceFlow(
          parsed,
          wrappedBrowserOpener,
          port,
          timeout,
          effectiveRedirectUri,
        );

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        return {
          method: 'cookie',
          credentials: {
            cookies: `Authorization: Bearer ${tokenData.access_token}`,
            expiresAt,
          },
        };
      } catch (err) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err as NodeJS.ErrnoException).code === 'EADDRINUSE'
        ) {
          lastError = err;
          log(`⚠️  Port ${port} in use, trying ${port + 1}...`);
          continue;
        }
        throw err; // Non-port error — rethrow immediately
      }
    }

    throw new Error(
      `All ports ${startPort}-${startPort + MAX_PORT_RETRIES - 1} are in use. ` +
        `Free a port or set callbackPort in plugin options.`,
      { cause: lastError },
    );
  },
};

export default authPlugin;
