/**
 * AFF schema access over the `git_modules/abap-file-formats` submodule.
 *
 * The submodule pin (`.gitmodules`) is the provenance record — schemas and
 * examples are always read from it at the pinned upstream SHA. This module
 * has no workspace dependencies (ajv + node builtins only) so schema
 * conformance tests run without building the workspace.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';

const SCHEMA_RE = /^([a-z0-9]+)-v(\d+)\.json$/;

function findAffRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'git_modules/abap-file-formats/file-formats');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error(
    'git_modules/abap-file-formats not found — is the submodule initialized? Run: git submodule update --init',
  );
}

let rootCache: string | undefined;
export function affRoot(): string {
  return (rootCache ??= findAffRoot());
}

/** All official AFF object types (directories in `file-formats/`). */
export function listAffTypes(): string[] {
  return readdirSync(affRoot(), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Format versions available for a type, newest first. */
export function affVersions(type: string): number[] {
  const dir = join(affRoot(), type);
  const scoped = existsSync(dir) ? readdirSync(dir) : [];
  // Root-level loose schemas (`docu-v1.json`, shared `zif_aff_*` types)
  const loose = readdirSync(affRoot());
  return [...scoped, ...loose]
    .map((f) => SCHEMA_RE.exec(f))
    .filter((m): m is RegExpExecArray => !!m && m[1] === type)
    .map((m) => Number(m[2]))
    .sort((a, b) => b - a);
}

export function latestAffVersion(type: string): number | undefined {
  return affVersions(type)[0];
}

interface AffSchema {
  title: string;
  type: string;
  properties: Record<string, { const?: string; type?: string }>;
  required?: string[];
  [key: string]: unknown;
}

export function affSchema(type: string, version?: number): AffSchema {
  const v = version ?? latestAffVersion(type);
  if (!v) throw new Error(`No AFF schema for ${type}`);
  for (const file of [
    join(affRoot(), type, `${type}-v${v}.json`),
    join(affRoot(), `${type}-v${v}.json`),
  ]) {
    if (existsSync(file))
      return JSON.parse(readFileSync(file, 'utf8')) as AffSchema;
  }
  throw new Error(`No AFF schema ${type}-v${v} under ${affRoot()}`);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators = new Map<string, ValidateFunction>();

/** Validate AFF JSON against the official schema for `type@version`. */
export function affValidate(
  type: string,
  json: unknown,
  version?: number,
): { valid: boolean; errors: string[] } {
  const v = version ?? latestAffVersion(type);
  const key = `${type}-v${v}`;
  let validate = validators.get(key);
  if (!validate) {
    validate = ajv.compile(affSchema(type, v));
    validators.set(key, validate);
  }
  const valid = validate(json);
  return {
    valid: !!valid,
    errors: (validate.errors ?? []).map((e) =>
      `${e.instancePath} ${e.message ?? ''}`.trim(),
    ),
  };
}

/**
 * Example JSON files shipped with a type — recursively, relative paths.
 * Companion files (`.docu.json`, LIMU sub-objects like `.reps.json`) are
 * included; callers match each to its schema (see `schemaForExample`).
 */
export function affExamples(type: string): string[] {
  const dir = join(affRoot(), type, 'examples');
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (sub: string): void => {
    for (const e of readdirSync(join(dir, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.json')) out.push(rel);
    }
  };
  walk('');
  return out.sort();
}

/**
 * Pick the schema a given example file should validate against.
 *
 * - `z_x.doma.docu.json` → the `docu` schema (companion documentation)
 * - otherwise → the type's own schema at the example's `formatVersion`
 */
export function schemaTargetForExample(
  type: string,
  filename: string,
  json: unknown,
): { type: string; version?: number; companion: boolean } {
  if (/\.docu\.json$/i.test(filename) && affVersions('docu').length)
    return { type: 'docu', companion: true };
  const declared = (json as { formatVersion?: string | number } | undefined)
    ?.formatVersion;
  const version = declared !== undefined ? Number(declared) : undefined;
  return { type, version, companion: false };
}

export function readAffExample(
  type: string,
  rel: string,
): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(affRoot(), type, 'examples', rel), 'utf8'),
  ) as Record<string, unknown>;
}
