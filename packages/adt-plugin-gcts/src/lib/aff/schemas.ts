/**
 * AFF schema access over the `git_modules/abap-file-formats` submodule.
 *
 * The submodule pin (`.gitmodules`) is the provenance record — schemas and
 * examples are always read from it at the pinned upstream SHA. This module
 * has no workspace dependencies (ajv + node builtins only) so schema
 * conformance tests run without building the workspace.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';

const SCHEMA_RE = /^([a-z0-9]+)-v(\d+)\.json$/;

/**
 * Locate the AFF schema root. Published packages ship only `dist`, so the
 * bundled `aff-schemas/` copy (produced by the build) is tried first; the
 * `git_modules` submodule is the dev fallback. Returns `undefined` when
 * neither exists — callers degrade gracefully instead of breaking plugin
 * load on installs that lack the submodule.
 */
function findAffRoot(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    const bundled = join(dir, 'aff-schemas');
    if (existsSync(bundled)) return bundled;
    const submodule = join(dir, 'git_modules/abap-file-formats/file-formats');
    if (existsSync(submodule)) return submodule;
    dir = dirname(dir);
  }
  return undefined;
}

let rootCache: string | undefined | null;
/** Resolved AFF schema root, or `undefined` when unavailable. */
export function affRoot(): string | undefined {
  if (rootCache === undefined) rootCache = findAffRoot() ?? null;
  return rootCache ?? undefined;
}

/** All official AFF object types (directories in `file-formats/`). */
export function listAffTypes(): string[] {
  const root = affRoot();
  // nosemgrep
  return root
    ? readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b))
    : [];
}

/**
 * Reference to a schema-bearing AFF artefact: an object `type` code plus an
 * optional format `version` (defaults to the latest wherever it matters).
 */
export interface AffRef {
  type: string;
  version?: number;
}

/** Format versions available for a type, newest first. */
export function affVersions(ref: AffRef): number[] {
  const type = ref.type.toLowerCase();
  const root = affRoot();
  if (!root) return [];
  const dir = join(root, type);
  // nosemgrep
  const scoped = existsSync(dir) ? readdirSync(dir) : [];
  // Root-level loose schemas (`docu-v1.json`, shared `zif_aff_*` types)
  // nosemgrep
  const loose = readdirSync(root);
  // LIMU sub-object schemas nest under their parent's dir
  // (`fugr/func-v1.json`, `fugr/reps-v1.json`)
  const nested = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== type)
    .flatMap((e) => {
      // nosemgrep
      try {
        return readdirSync(join(root, e.name));
      } catch {
        return [];
      }
    });
  return [
    ...new Set(
      [...scoped, ...loose, ...nested]
        .map((f) => SCHEMA_RE.exec(f))
        .filter((m): m is RegExpExecArray => !!m && m[1] === type)
        .map((m) => Number(m[2])),
    ),
  ].sort((a, b) => b - a);
}

export function latestAffVersion(ref: AffRef): number | undefined {
  return affVersions(ref)[0];
}

interface AffSchema {
  title: string;
  type: string;
  properties: Record<string, { const?: string; type?: string }>;
  required?: string[];
  [key: string]: unknown;
}

interface SchemaQuery {
  root: string;
  type: string;
  version: number;
}

/** `<root>/<type>/<type>-vN.json` or root-level `<type>-vN.json` (docu). */
function directSchemaFile(q: SchemaQuery): string | undefined {
  const stem = `${q.type}-v${q.version}.json`;
  for (const file of [join(q.root, q.type, stem), join(q.root, stem)]) {
    // nosemgrep
    if (existsSync(file)) return file;
  }
  return undefined;
}

/** LIMU sub-object schemas nest under their parent's dir (`fugr/func-v1.json`). */
function nestedSchemaFile(q: SchemaQuery): string | undefined {
  for (const dir of listAffTypes()) {
    if (dir === q.type) continue;
    // nosemgrep
    const file = join(q.root, dir, `${q.type}-v${q.version}.json`);
    // nosemgrep
    if (existsSync(file)) return file;
  }
  return undefined;
}

/** First existing candidate path for a type+version schema, or none. */
function findSchemaFile(q: SchemaQuery): string | undefined {
  return directSchemaFile(q) ?? nestedSchemaFile(q);
}

export function affSchema(ref: AffRef): AffSchema {
  const type = ref.type.toLowerCase();
  const version = ref.version ?? latestAffVersion({ ...ref, type });
  if (!version) throw new Error(`No AFF schema for ${type}`);
  const root = affRoot();
  if (!root) throw new Error(`No AFF schema root available for ${type}`);
  const file = findSchemaFile({ root, type, version });
  if (!file) throw new Error(`No AFF schema ${type}-v${version} under ${root}`);
  // nosemgrep
  return JSON.parse(readFileSync(file, 'utf8')) as AffSchema;
}

/**
 * Top-level body properties of a type's schema (everything beyond the
 * mandatory `formatVersion`/`header` envelope), newest version by default.
 * Empty array for header-only types or when schemas are unavailable.
 */
export function affBodyProps(ref: AffRef): string[] {
  let schema: AffSchema;
  try {
    schema = affSchema(ref);
  } catch (error) {
    // Missing schemas degrade gracefully (plugin load must not break on
    // installs without the submodule); a corrupt schema file is a bug —
    // let it throw rather than silently dropping every body field.
    if (error instanceof Error && error.message.startsWith('No AFF schema'))
      return [];
    throw error;
  }
  return Object.keys(schema.properties ?? {}).filter(
    (p) => p !== 'formatVersion' && p !== 'header',
  );
}

export function affHeaderProps(ref: AffRef): string[] {
  let schema: AffSchema;
  try {
    schema = affSchema(ref);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No AFF schema'))
      return [];
    throw error;
  }
  const header = (schema.properties ?? {}).header;
  return Object.keys(
    header && typeof header === 'object' && header.properties
      ? header.properties
      : {},
  );
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators = new Map<string, ValidateFunction>();

/** Resolve a usable schema version, or `undefined` when none exists. */
function resolveAffVersion(type: string, v?: number): number | undefined {
  const resolved = v ?? latestAffVersion({ type });
  return resolved !== undefined && Number.isInteger(resolved) && resolved > 0
    ? resolved
    : undefined;
}

/** Compile (and cache) the AJV validator for a type+version. */
function getValidator(
  type: string,
  version: number,
): { validator?: ValidateFunction; error?: string } {
  const key = `${type}-v${version}`;
  const cached = validators.get(key);
  if (cached) return { validator: cached };
  try {
    const validator = ajv.compile(affSchema({ type, version }));
    validators.set(key, validator);
    return { validator };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Validate AFF JSON against the official schema for `ref`. */
export function affValidate(
  ref: AffRef,
  json: unknown,
): { valid: boolean; errors: string[] } {
  const type = ref.type.toLowerCase();
  const v = resolveAffVersion(type, ref.version);
  if (v === undefined) {
    return { valid: false, errors: [`No AFF schema for type "${type}"`] };
  }
  const { validator, error } = getValidator(type, v);
  if (!validator) {
    return { valid: false, errors: [error ?? 'schema compile failed'] };
  }
  const valid = validator(json);
  return {
    valid: !!valid,
    errors: (validator.errors ?? []).map((e) =>
      `${e.instancePath} ${e.message ?? ''}`.trim(),
    ),
  };
}

/**
 * Example JSON files shipped with a type — recursively, relative paths.
 * Companion files (`.docu.json`, LIMU sub-objects like `.reps.json`) are
 * included; callers match each to its schema (see `schemaTargetForExample`).
 */
export function affExamples(ref: AffRef): string[] {
  const root = affRoot();
  if (!root) return [];
  const dir = join(root, ref.type.toLowerCase(), 'examples');
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (sub: string): void => {
    // nosemgrep
    for (const e of readdirSync(join(dir, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.json')) out.push(rel);
    }
  };
  walk('');
  return out.sort((a, b) => a.localeCompare(b));
}

/** LIMU sub-object document suffix → schema type (nested under parent dir). */
const LIMU_SUB_SCHEMA = /\.(reps|sotr|sotu|cpub|cpro|cprt|cpri|func)\.json$/i;

/**
 * Pick the schema a given example file should validate against.
 *
 * - `z_x.doma.docu.json` → the `docu` schema (companion documentation)
 * - `x.fugr.z_fm.func.json` / `x.fugr.y.reps.json` → the LIMU
 *   sub-object's own schema (nested under the parent type dir)
 * - otherwise → the type's own schema at the example's `formatVersion`
 */
export function schemaTargetForExample(
  ref: AffRef,
  filename: string,
  json: unknown,
): { type: string; version?: number; companion: boolean } {
  if (/\.docu\.json$/i.test(filename) && affVersions({ type: 'docu' }).length)
    return { type: 'docu', companion: true };
  const declared = (json as { formatVersion?: string | number } | undefined)
    ?.formatVersion;
  const version = declared !== undefined ? Number(declared) : undefined;
  const limu = LIMU_SUB_SCHEMA.exec(filename)?.[1]?.toLowerCase();
  if (limu && affVersions({ type: limu }).length)
    return { type: limu, version, companion: true };
  return { type: ref.type, version, companion: false };
}

export function readAffExample(
  ref: AffRef,
  rel: string,
): Record<string, unknown> {
  const root = affRoot();
  if (!root) throw new Error('No AFF schema root available');
  const examplesDir = resolve(root, ref.type.toLowerCase(), 'examples');
  const file = resolve(examplesDir, rel);
  if (file !== examplesDir && !file.startsWith(examplesDir + sep)) {
    throw new Error(`Example path escapes examples dir: ${rel}`);
  }
  // nosemgrep
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}
