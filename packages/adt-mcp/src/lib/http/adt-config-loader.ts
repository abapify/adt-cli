/**
 * adt-config adapter for adt-mcp multi-system registry.
 *
 * Loads SAP system definitions from `adt.config.ts` / `adt.config.json`
 * (via `@abapify/adt-config`) and returns a {@link MultiSystemConfig}
 * compatible object that `startHttpServer()` can consume.
 *
 * Only destinations with a resolvable `url` field in their `options`
 * (or the shorthand string URL) are included. Credentials (username /
 * password) are intentionally NOT loaded — they must be supplied at
 * runtime via the `sap_connect` tool call, matching the security policy
 * of the existing multi-system loader.
 */

import { loadConfig } from '@abapify/adt-config';
import type { MultiSystemConfig } from './multi-system.js';
import type { ConnectionParams } from '../types.js';

/**
 * Sanitize a URL for safe logging by stripping any embedded credentials
 * (userinfo component) that a user might accidentally include.
 */
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.username = '';
    u.password = '';
    return u.toString();
  } catch {
    return '<invalid-url>';
  }
}

/**
 * Attempt to extract a `baseUrl` from a destination's options object.
 * Handles both `{ url: '...' }` and `{ baseUrl: '...' }` shapes, as
 * different auth plugins use different field names.
 */
function extractBaseUrl(options: unknown): string | undefined {
  if (!options || typeof options !== 'object') return undefined;
  const o = options as Record<string, unknown>;
  if (typeof o.url === 'string' && o.url.length > 0) return o.url;
  if (typeof o.baseUrl === 'string' && o.baseUrl.length > 0) return o.baseUrl;
  return undefined;
}

function extractClient(options: unknown): string | undefined {
  if (!options || typeof options !== 'object') return undefined;
  const o = options as Record<string, unknown>;
  if (typeof o.client === 'string' && o.client.length > 0) return o.client;
  return undefined;
}

/**
 * Load system definitions from `adt-config` and expose them as a
 * {@link MultiSystemConfig} for the MCP HTTP server.
 *
 * @param configPath Optional explicit path to `adt.config.ts` / `adt.config.json`.
 *                   When omitted, `@abapify/adt-config` auto-discovers from `cwd`.
 * @param cwd        Working directory for auto-discovery. Defaults to `process.cwd()`.
 */
export async function loadAdtConfigMultiSystem(
  configPath?: string,
  cwd?: string,
): Promise<MultiSystemConfig> {
  // Warn when a TypeScript config file is requested but the current runtime
  // is plain Node.js (not Bun). Node cannot `import()` a `.ts` file directly
  // without a loader, so the config would be silently ignored. Bun natively
  // supports TypeScript, so this is only a concern for production Node deployments.
  if (
    configPath?.endsWith('.ts') &&
    typeof (globalThis as Record<string, unknown>).Bun === 'undefined'
  ) {
    throw new Error(
      `ADT_CONFIG_FILE '${configPath}' is TypeScript; plain Node.js cannot load .ts configs. ` +
        `Use adt.config.json, a compiled .mjs config, or run adt-mcp-http with Bun ` +
        `(e.g. bunx nx run adt-mcp:serve).`,
    );
  }

  const loaded = await loadConfig({ configPath, cwd });
  const systems: Record<string, { baseUrl: string; client?: string }> = {};

  for (const sid of loaded.listDestinations()) {
    const dest = loaded.getDestination(sid);
    if (!dest) continue;

    let baseUrl: string | undefined;
    let client: string | undefined;

    if (typeof dest === 'string') {
      baseUrl = dest;
    } else {
      baseUrl = extractBaseUrl(dest.options);
      client = extractClient(dest.options);
    }

    if (!baseUrl) {
      process.stderr.write(
        `[adt-config-loader] warning: destination '${sid}' has no resolvable URL — skipping.\n`,
      );
      continue;
    }

    systems[sid] = { baseUrl, ...(client ? { client } : {}) };
    process.stderr.write(
      `[adt-config-loader] loaded system '${sid}' → ${sanitizeUrl(baseUrl)}\n`,
    );
  }

  return {
    systems,
    resolve(systemId: string): ConnectionParams | undefined {
      const entry = systems[systemId];
      if (!entry) return undefined;
      return { baseUrl: entry.baseUrl, client: entry.client };
    },
  };
}
