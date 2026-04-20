#!/usr/bin/env node
/**
 * adt-mcp-http — Streamable HTTP entry-point for the MCP server.
 *
 * Usage:
 *   adt-mcp-http [--port 3000] [--host 127.0.0.1] [--ttl 1800000]
 *
 * Environment:
 *   MCP_PORT          Listen port (default 3000).
 *   MCP_HOST          Bind address (default 127.0.0.1).
 *   MCP_ALLOWED_HOSTS Comma-separated additional hostnames for the
 *                     Host-header allowlist.
 *   SAP_SYSTEMS_JSON  Inline multi-system config as JSON.
 *   SAP_SYSTEMS_FILE  Path to a multi-system config JSON file.
 */

import { startHttpServer } from '../lib/http/server.js';

interface ParsedArgs {
  port?: number;
  host?: string;
  ttlMs?: number;
  allowedHosts?: string[];
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
      case '--help':
      case '-h': {
        process.stdout.write(
          'Usage: adt-mcp-http [--port N] [--host HOST] [--ttl MS] [--allowed-host H ...]\n',
        );
        process.exit(0);
      }
      default:
        // Unknown flag — ignore for forward compatibility.
        break;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const envAllowed = process.env.MCP_ALLOWED_HOSTS
    ? process.env.MCP_ALLOWED_HOSTS.split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const running = await startHttpServer({
    port: args.port,
    host: args.host,
    ttlMs: args.ttlMs,
    allowedHosts: [...(args.allowedHosts ?? []), ...envAllowed],
  });

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
