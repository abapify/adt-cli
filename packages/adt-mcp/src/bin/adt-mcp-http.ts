#!/usr/bin/env node
/**
 * adt-mcp-http — Streamable HTTP entry-point for the MCP server.
 *
 * Usage:
 *   adt-mcp-http [--port 3000] [--host 127.0.0.1] [--ttl 1800000]
 *                [--auth-token <value>] [--trust-forwarded-auth]
 *                [--cors-origin <origin>]...
 *
 * Environment:
 *   MCP_PORT              Listen port (default 3000).
 *   MCP_HOST              Bind address (default 127.0.0.1).
 *   MCP_ALLOWED_HOSTS     Comma-separated additional hostnames for the
 *                         Host-header allowlist.
 *   MCP_AUTH_TOKEN        Bearer token. Implies --auth-mode=bearer.
 *   TRUST_FORWARDED_AUTH  Set to "1" / "true" to enable reverse-proxy
 *                         (x-forwarded-user) trust mode.
 *   MCP_CORS_ORIGIN       Comma-separated CORS allow-list.
 *   SAP_SYSTEMS_JSON      Inline multi-system config as JSON.
 *   SAP_SYSTEMS_FILE      Path to a multi-system config JSON file.
 *   ADT_CONFIG_FILE       Path to adt.config.ts/json. When set, system
 *                         definitions are loaded from adt-config instead
 *                         of SAP_SYSTEMS_JSON / SAP_SYSTEMS_FILE.
 */

import { startHttpServer } from '../lib/http/server.js';
import type { OAuthOptions } from '../lib/http/oauth.js';
import type { MultiSystemConfig } from '../lib/http/multi-system.js';
import { loadAdtConfigMultiSystem } from '../lib/http/adt-config-loader.js';

type AuthMode = 'none' | 'bearer' | 'proxy' | 'oauth';

interface ParsedArgs {
  port?: number;
  host?: string;
  ttlMs?: number;
  allowedHosts?: string[];
  authToken?: string;
  authMode?: AuthMode;
  trustForwardedAuth?: boolean;
  allowedOrigins?: string[];
  oauthIssuer?: string;
  oauthAudience?: string[];
  oauthJwksUri?: string;
  oauthRequiredScopes?: string[];
  oauthUserClaim?: string;
  adtConfigFile?: string;
  tlsCert?: string;
  tlsKey?: string;
}

type FlagHandler = (out: ParsedArgs, next: () => string) => void;

function setNumber(key: 'port' | 'ttlMs'): FlagHandler {
  return (out, next) => {
    const v = Number(next());
    if (Number.isFinite(v)) out[key] = v;
  };
}

function setString(
  key:
    | 'oauthIssuer'
    | 'oauthJwksUri'
    | 'oauthUserClaim'
    | 'adtConfigFile'
    | 'tlsCert'
    | 'tlsKey',
): FlagHandler {
  return (out, next) => {
    const v = next();
    if (v) out[key] = v;
  };
}

function appendValue(key: 'allowedHosts' | 'allowedOrigins'): FlagHandler {
  return (out, next) => {
    const v = next();
    if (v) {
      const list = (out[key] ??= []);
      list.push(v);
    }
  };
}

function appendCsv(key: 'oauthAudience' | 'oauthRequiredScopes'): FlagHandler {
  return (out, next) => {
    const v = next();
    if (v) {
      const list = (out[key] ??= []);
      list.push(...parseCsvEnv(v));
    }
  };
}

function printUsage(): void {
  process.stdout.write(
    'Usage: adt-mcp-http [--port N] [--host HOST] [--ttl MS]\n' +
      '                    [--allowed-host H ...]\n' +
      '                    [--auth-token TOKEN | --auth-mode MODE]\n' +
      '                    [--trust-forwarded-auth]\n' +
      '                    [--oauth-issuer URL] [--oauth-audience VAL]\n' +
      '                    [--oauth-jwks-uri URL]\n' +
      '                    [--oauth-required-scope SCOPE]\n' +
      '                    [--oauth-user-claim NAME]\n' +
      '                    [--cors-origin ORIGIN ...]\n' +
      '                    [--adt-config PATH]\n' +
      '                    [--tls-cert PATH] [--tls-key PATH]\n',
  );
  process.exit(0);
}

const FLAG_HANDLERS = new Map<string, FlagHandler>([
  ['--port', setNumber('port')],
  ['-p', setNumber('port')],
  [
    '--host',
    (out, next) => {
      out.host = next();
    },
  ],
  [
    '-H',
    (out, next) => {
      out.host = next();
    },
  ],
  ['--ttl', setNumber('ttlMs')],
  ['--allowed-host', appendValue('allowedHosts')],
  [
    '--auth-token',
    (out, next) => {
      const v = next();
      if (v) {
        out.authToken = v;
        out.authMode = 'bearer';
      }
    },
  ],
  [
    '--auth-mode',
    (out, next) => {
      const v = next();
      if (v === 'none' || v === 'bearer' || v === 'proxy' || v === 'oauth') {
        out.authMode = v;
      }
    },
  ],
  [
    '--trust-forwarded-auth',
    (out) => {
      out.trustForwardedAuth = true;
      out.authMode = 'proxy';
    },
  ],
  ['--oauth-issuer', setString('oauthIssuer')],
  ['--oauth-audience', appendCsv('oauthAudience')],
  ['--oauth-jwks-uri', setString('oauthJwksUri')],
  ['--oauth-required-scope', appendCsv('oauthRequiredScopes')],
  ['--oauth-user-claim', setString('oauthUserClaim')],
  ['--cors-origin', appendValue('allowedOrigins')],
  ['--adt-config', setString('adtConfigFile')],
  ['--tls-cert', setString('tlsCert')],
  ['--tls-key', setString('tlsKey')],
  ['--help', printUsage],
  ['-h', printUsage],
]);

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const handler = FLAG_HANDLERS.get(argv[i]);
    // Unknown flag — ignore for forward compatibility.
    if (handler === undefined) continue;
    if (typeof handler !== 'function') continue;
    handler(out, () => argv[++i]);
  }
  return out;
}

function isTruthyEnv(v: string | undefined): boolean {
  if (!v) return false;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function parseCsvEnv(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface OAuthSettings {
  readonly issuer: string | undefined;
  readonly audience: string[] | undefined;
  readonly jwksUri: string | undefined;
  readonly requiredScopes: string[] | undefined;
  readonly userClaim: string | undefined;
}

// OAuth config — CLI wins, env fills the gaps.
function resolveOAuthSettings(args: ParsedArgs): OAuthSettings {
  return {
    issuer: args.oauthIssuer ?? process.env.OAUTH_ISSUER,
    audience: args.oauthAudience ?? parseCsvEnv(process.env.OAUTH_AUDIENCE),
    jwksUri: args.oauthJwksUri ?? process.env.OAUTH_JWKS_URI,
    requiredScopes:
      args.oauthRequiredScopes ??
      parseCsvEnv(process.env.OAUTH_REQUIRED_SCOPES),
    userClaim: args.oauthUserClaim ?? process.env.OAUTH_USER_CLAIM,
  };
}

function computeAuthMode(
  args: ParsedArgs,
  authToken: string | undefined,
  envTrustForwarded: boolean,
): AuthMode {
  let authMode: AuthMode = args.authMode ?? 'none';
  if (authToken && authMode === 'none') authMode = 'bearer';
  // TRUST_FORWARDED_AUTH (env or flag) may only promote a still-unset
  // `authMode` to 'proxy'. An explicit --auth-mode (e.g. oauth) must never
  // be silently downgraded by a stale env var — that would bypass JWT
  // validation. The explicit --trust-forwarded-auth CLI flag also requires
  // authMode to currently be 'none' to win, preserving the "most specific
  // intent wins, never silently weaken" rule.
  if ((args.trustForwardedAuth || envTrustForwarded) && authMode === 'none') {
    authMode = 'proxy';
  }
  return authMode;
}

function assertAuthConfig(
  authMode: AuthMode,
  authToken: string | undefined,
  oauthIssuer: string | undefined,
): void {
  // Startup sanity check: bearer mode without a token cannot work.
  if (authMode === 'bearer' && (!authToken || authToken.length === 0)) {
    process.stderr.write(
      '[adt-mcp-http] fatal: MCP_AUTH_TOKEN (or --auth-token) required when --auth-mode=bearer\n',
    );
    process.exit(1);
  }

  // Startup sanity check: oauth mode requires at least an issuer.
  if (authMode === 'oauth' && (!oauthIssuer || oauthIssuer.length === 0)) {
    process.stderr.write(
      '[adt-mcp-http] fatal: --oauth-issuer (or OAUTH_ISSUER) required when --auth-mode=oauth\n',
    );
    process.exit(1);
  }
}

function buildOAuthOptions(oauth: OAuthSettings): OAuthOptions {
  const singleAudience =
    oauth.audience?.length === 1 ? oauth.audience[0] : oauth.audience;
  return {
    issuer: oauth.issuer as string,
    audience:
      oauth.audience && oauth.audience.length > 0 ? singleAudience : undefined,
    jwksUri: oauth.jwksUri,
    requiredScopes:
      oauth.requiredScopes && oauth.requiredScopes.length > 0
        ? oauth.requiredScopes
        : undefined,
    userClaim: oauth.userClaim,
  };
}

function warnInsecureBinding(authMode: AuthMode, host: string): void {
  const isLoopback =
    host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (authMode === 'none' && !isLoopback) {
    process.stderr.write(
      `[adt-mcp-http] WARN: auth disabled and bound to non-loopback host '${host}' — ` +
        'anyone with network access can use the server. ' +
        'Set MCP_AUTH_TOKEN or TRUST_FORWARDED_AUTH=1 before exposing.\n',
    );
  }
  if (authMode === 'proxy' && !isLoopback) {
    process.stderr.write(
      `[adt-mcp-http] WARN: TRUST_FORWARDED_AUTH enabled on non-loopback host '${host}' — ` +
        'x-forwarded-user is trusted unconditionally. ' +
        'Only use this mode behind a reverse proxy that strips these headers from untrusted input.\n',
    );
  }
}

function logOAuthEnabled(oauthOptions: OAuthOptions): void {
  const audDisplay = Array.isArray(oauthOptions.audience)
    ? oauthOptions.audience.join(',')
    : (oauthOptions.audience ?? '<any>');
  const scopesDisplay = oauthOptions.requiredScopes?.length
    ? oauthOptions.requiredScopes.join(',')
    : '<none>';
  process.stderr.write(
    `[adt-mcp-http] OAuth validation enabled: issuer=${oauthOptions.issuer} audience=${audDisplay} scopes=${scopesDisplay}\n`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const envAllowed = parseCsvEnv(process.env.MCP_ALLOWED_HOSTS);
  const envCorsOrigins = parseCsvEnv(process.env.MCP_CORS_ORIGIN);
  const envTrustForwarded = isTruthyEnv(process.env.TRUST_FORWARDED_AUTH);

  // CLI flag takes precedence over env. Env MCP_AUTH_TOKEN is used when
  // the flag is absent.
  const authToken = args.authToken ?? process.env.MCP_AUTH_TOKEN;

  const oauth = resolveOAuthSettings(args);
  let authMode = computeAuthMode(args, authToken, envTrustForwarded);
  if (authMode === 'none' && oauth.issuer) {
    // If user supplied OAuth config without explicit --auth-mode, assume
    // they meant oauth. Explicit --auth-mode always wins.
    authMode = 'oauth';
  }

  assertAuthConfig(authMode, authToken, oauth.issuer);

  const oauthOptions =
    authMode === 'oauth' && oauth.issuer ? buildOAuthOptions(oauth) : undefined;

  const host = args.host ?? process.env.MCP_HOST ?? '127.0.0.1';
  warnInsecureBinding(authMode, host);

  const adtConfigFile = args.adtConfigFile ?? process.env.ADT_CONFIG_FILE;
  let multiSystem: MultiSystemConfig | undefined;
  if (adtConfigFile) {
    process.stderr.write(
      `[adt-mcp-http] loading system registry from adt-config: ${adtConfigFile}\n`,
    );
    multiSystem = await loadAdtConfigMultiSystem(adtConfigFile);
  }

  const running = await startHttpServer({
    ...(multiSystem ? { multiSystem } : {}),
    port: args.port,
    host: args.host,
    ttlMs: args.ttlMs,
    allowedHosts: [...(args.allowedHosts ?? []), ...envAllowed],
    authMode,
    authToken,
    trustForwardedAuth: args.trustForwardedAuth || envTrustForwarded,
    oauth: oauthOptions,
    allowedOrigins: [...(args.allowedOrigins ?? []), ...envCorsOrigins],
    tlsCert: args.tlsCert,
    tlsKey: args.tlsKey,
  });

  if (authMode === 'oauth' && oauthOptions) {
    logOAuthEnabled(oauthOptions);
  }

  const shutdown = async (signal: string): Promise<void> => {
    process.stderr.write(`[adt-mcp-http] received ${signal}, shutting down\n`);
    try {
      await running.close();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

try {
  await main();
} catch (err) {
  process.stderr.write(
    `[adt-mcp-http] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
}
