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
 */

import { startHttpServer } from '../lib/http/server.js';
import type { OAuthOptions } from '../lib/http/oauth.js';

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
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--port':
      case '-p': {
        const v = Number(next());
        if (Number.isFinite(v)) out.port = v;
        break;
      }
      case '--host':
      case '-H': {
        out.host = next();
        break;
      }
      case '--ttl': {
        const v = Number(next());
        if (Number.isFinite(v)) out.ttlMs = v;
        break;
      }
      case '--allowed-host': {
        const v = next();
        if (v) (out.allowedHosts ??= []).push(v);
        break;
      }
      case '--auth-token': {
        const v = next();
        if (v) {
          out.authToken = v;
          out.authMode = 'bearer';
        }
        break;
      }
      case '--auth-mode': {
        const v = next();
        if (v === 'none' || v === 'bearer' || v === 'proxy' || v === 'oauth') {
          out.authMode = v;
        }
        break;
      }
      case '--trust-forwarded-auth': {
        out.trustForwardedAuth = true;
        out.authMode = 'proxy';
        break;
      }
      case '--oauth-issuer': {
        const v = next();
        if (v) out.oauthIssuer = v;
        break;
      }
      case '--oauth-audience': {
        const v = next();
        if (v) {
          (out.oauthAudience ??= []).push(
            ...v
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          );
        }
        break;
      }
      case '--oauth-jwks-uri': {
        const v = next();
        if (v) out.oauthJwksUri = v;
        break;
      }
      case '--oauth-required-scope': {
        const v = next();
        if (v) {
          (out.oauthRequiredScopes ??= []).push(
            ...v
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          );
        }
        break;
      }
      case '--oauth-user-claim': {
        const v = next();
        if (v) out.oauthUserClaim = v;
        break;
      }
      case '--cors-origin': {
        const v = next();
        if (v) (out.allowedOrigins ??= []).push(v);
        break;
      }
      case '--help':
      case '-h': {
        process.stdout.write(
          'Usage: adt-mcp-http [--port N] [--host HOST] [--ttl MS]\n' +
            '                    [--allowed-host H ...]\n' +
            '                    [--auth-token TOKEN | --auth-mode MODE]\n' +
            '                    [--trust-forwarded-auth]\n' +
            '                    [--oauth-issuer URL] [--oauth-audience VAL]\n' +
            '                    [--oauth-jwks-uri URL]\n' +
            '                    [--oauth-required-scope SCOPE]\n' +
            '                    [--oauth-user-claim NAME]\n' +
            '                    [--cors-origin ORIGIN ...]\n',
        );
        process.exit(0);
      }
      // eslint-disable-next-line no-fallthrough
      default:
        // Unknown flag — ignore for forward compatibility.
        break;
    }
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const envAllowed = parseCsvEnv(process.env.MCP_ALLOWED_HOSTS);
  const envCorsOrigins = parseCsvEnv(process.env.MCP_CORS_ORIGIN);
  const envTrustForwarded = isTruthyEnv(process.env.TRUST_FORWARDED_AUTH);

  // CLI flag takes precedence over env. Env MCP_AUTH_TOKEN is used when
  // the flag is absent.
  const authToken = args.authToken ?? process.env.MCP_AUTH_TOKEN;
  let authMode: AuthMode = args.authMode ?? 'none';
  if (authToken && authMode === 'none') authMode = 'bearer';
  if (args.trustForwardedAuth || envTrustForwarded) authMode = 'proxy';

  // OAuth config — CLI wins, env fills the gaps.
  const oauthIssuer = args.oauthIssuer ?? process.env.OAUTH_ISSUER;
  const oauthAudience =
    args.oauthAudience ?? parseCsvEnv(process.env.OAUTH_AUDIENCE);
  const oauthJwksUri = args.oauthJwksUri ?? process.env.OAUTH_JWKS_URI;
  const oauthRequiredScopes =
    args.oauthRequiredScopes ?? parseCsvEnv(process.env.OAUTH_REQUIRED_SCOPES);
  const oauthUserClaim = args.oauthUserClaim ?? process.env.OAUTH_USER_CLAIM;

  if (authMode === 'none' && oauthIssuer) {
    // If user supplied OAuth config without explicit --auth-mode, assume
    // they meant oauth. Explicit --auth-mode always wins.
    authMode = 'oauth';
  }

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

  let oauthOptions: OAuthOptions | undefined;
  if (authMode === 'oauth' && oauthIssuer) {
    oauthOptions = {
      issuer: oauthIssuer,
      audience:
        oauthAudience && oauthAudience.length > 0
          ? oauthAudience.length === 1
            ? oauthAudience[0]
            : oauthAudience
          : undefined,
      jwksUri: oauthJwksUri,
      requiredScopes:
        oauthRequiredScopes && oauthRequiredScopes.length > 0
          ? oauthRequiredScopes
          : undefined,
      userClaim: oauthUserClaim,
    };
  }

  const host = args.host ?? process.env.MCP_HOST ?? '127.0.0.1';
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

  const running = await startHttpServer({
    port: args.port,
    host: args.host,
    ttlMs: args.ttlMs,
    allowedHosts: [...(args.allowedHosts ?? []), ...envAllowed],
    authMode,
    authToken,
    trustForwardedAuth: args.trustForwardedAuth || envTrustForwarded,
    oauth: oauthOptions,
    allowedOrigins: [...(args.allowedOrigins ?? []), ...envCorsOrigins],
  });

  if (authMode === 'oauth' && oauthOptions) {
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

main().catch((err) => {
  process.stderr.write(
    `[adt-mcp-http] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
