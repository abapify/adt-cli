/**
 * Multi-system configuration loader for adt-mcp HTTP transport.
 *
 * Resolves a logical system id (e.g. `DEV`, `PROD`) to concrete ADT
 * connection parameters. Sources (priority order):
 *
 *   1. `SAP_SYSTEMS_JSON` env var — inline JSON object
 *      `{ "DEV": { "baseUrl": "...", "client": "100" }, ... }`
 *   2. `SAP_SYSTEMS_FILE` env var — path to a JSON file (YAML is NOT
 *      supported in this wave to avoid adding new runtime deps).
 *   3. `~/.adt/systems.json` — default JSON file (YAML is NOT supported).
 *
 * Missing/empty config yields an empty registry, and `resolve()` returns
 * `undefined` for every id.
 *
 * Security policy: the registry holds ONLY connection metadata
 * (`baseUrl`, `client`). Credentials (`username`, `password`) MUST come
 * from the `sap_connect` tool call at runtime, never from disk. Any
 * `username`/`password` fields present in the JSON are silently dropped
 * with a warning so secrets-in-config mistakes don't leak.
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ConnectionParams } from '../types.js';

export interface SystemEntry {
  baseUrl: string;
  client?: string;
}

export interface MultiSystemConfig {
  systems: Record<string, SystemEntry>;
  resolve(systemId: string): ConnectionParams | undefined;
}

type RawConfig = Record<
  string,
  { baseUrl?: string; client?: string; username?: unknown; password?: unknown }
>;

function parseJsonSafe(raw: string, source: string): RawConfig {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`expected a JSON object, got ${typeof value}`);
    }
    return value as RawConfig;
  } catch (err) {
    throw new Error(
      `Failed to parse multi-system config from ${source}: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { cause: err },
    );
  }
}

function normalise(raw: RawConfig): Record<string, SystemEntry> {
  const out: Record<string, SystemEntry> = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    if (typeof entry.baseUrl !== 'string' || entry.baseUrl.length === 0) {
      continue;
    }
    if (entry.username || entry.password) {
      // Defence against secrets in disk config. Keep the system entry
      // but drop the credentials — caller must supply them at runtime.
      process.stderr.write(
        `[multi-system] warning: system '${id}' contains credentials ` +
          `in config; dropping them. Pass credentials via sap_connect at runtime.\n`,
      );
    }
    out[id] = {
      baseUrl: entry.baseUrl,
      client: entry.client,
    };
  }
  return out;
}

export function loadMultiSystemConfig(): MultiSystemConfig {
  let raw: RawConfig | undefined;

  if (process.env.SAP_SYSTEMS_JSON) {
    raw = parseJsonSafe(process.env.SAP_SYSTEMS_JSON, 'SAP_SYSTEMS_JSON');
  } else {
    const explicit = process.env.SAP_SYSTEMS_FILE;
    const defaultPath = join(homedir(), '.adt', 'systems.json');
    const path = explicit && explicit.length > 0 ? explicit : defaultPath;
    if (existsSync(path)) {
      raw = parseJsonSafe(readFileSync(path, 'utf8'), path);
    }
  }

  const systems = raw ? normalise(raw) : {};

  return {
    systems,
    resolve(systemId: string): ConnectionParams | undefined {
      const entry = systems[systemId];
      if (!entry) return undefined;
      return {
        baseUrl: entry.baseUrl,
        client: entry.client,
      };
    },
  };
}
