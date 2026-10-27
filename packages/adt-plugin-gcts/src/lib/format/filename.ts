/**
 * gCTS / AFF filename conventions.
 *
 * gCTS and AFF both use the pattern `<name>.<type>.<ext>` (same as abapGit),
 * but with JSON for metadata instead of XML and with CDS-specific
 * extensions (`.acds`, `.asddls`, ...) for CDS sources.
 *
 * Packages use a fixed `package.devc.json` filename (mirrors abapGit's
 * `package.devc.xml`).
 *
 * This module is independent of any particular handler — it exists so that
 * consumers (diff, round-trip tests, deserializers) can map filenames to
 * (name, type) pairs without pulling in the object-type registry.
 */

import type { ParsedFormatFilename } from '@abapify/adt-plugin';

/**
 * Extension used for the source-file part of each object type.
 *
 * Order of precedence: CDS types use AFF's `.asddls` / `.asdcls`; everything
 * else uses `.abap`. Metadata is always `.json`.
 */
const TYPE_TO_SOURCE_EXT: Record<string, string> = {
  CLAS: 'abap',
  INTF: 'abap',
  PROG: 'abap',
  FUGR: 'abap',
  FUNC: 'abap',
  DDLS: 'asddls',
  DCLS: 'asdcls',
  BDEF: 'abdl',
  SRVD: 'acds',
  // AFF-`.acds` CDS-family sources (upstream examples are uniform:
  // `<name>.<type>.acds` for every CDS-bearing type).
  DDLA: 'acds',
  DDLX: 'acds',
  DTSC: 'acds',
  DTIX: 'acds',
  DTEB: 'acds',
  DTDC: 'acds',
  DRAS: 'acds',
  DRTY: 'acds',
  DSFD: 'acds',
  CSNM: 'csn',
  SFPF: 'xdp',
  XSLT: 'xml',
};

/** Metadata extension for all AFF/gCTS objects. */
export const METADATA_EXTENSION = 'json';

/** Fixed filename for package metadata (AFF / gCTS convention). */
export const PACKAGE_FILENAME = 'package.devc.json';

/**
 * AFF filename-safe form of an object name: namespaces encode as brackets
 * (`/NMSPC/CL_OBJECT` → `(nmspc)cl_object`, AFF spec §file-names) so a
 * `/` in the name can never split the file into nested directories.
 */
export function affName(name: string): string {
  return name.toLowerCase().replace(/^\/([^/]+)\//, '($1)');
}

/**
 * Build the AFF/gCTS on-disk filename for an object.
 *
 * @param name     Object name (case preserved — AFF normalises to lowercase)
 * @param type     ABAP object type code (CLAS, INTF, ...)
 * @param kind     `"metadata"` (default) or `"source"`.
 * @param suffix   Optional sub-include suffix (e.g. `locals_def` for CLAS,
 *                  or `z_func.func` for a LIMU sub-object).
 * @param ext      Source-file extension override — defaults to the type's
 *                  extension (`abap`, `acds`, …). Needed for companions whose
 *                  extension differs from the type's main source (`.json`
 *                  LIMU metadata, `.properties` texts).
 */
export function gctsFilename(
  name: string,
  type: string,
  kind: 'metadata' | 'source' = 'metadata',
  suffix?: string,
  ext?: string,
): string {
  const base = affName(name);
  const typeLower = mainType(type).toLowerCase();
  if (kind === 'metadata') {
    return `${base}.${typeLower}.${METADATA_EXTENSION}`;
  }
  const sourceExt =
    ext ?? TYPE_TO_SOURCE_EXT[mainType(type).toUpperCase()] ?? 'abap';
  return suffix
    ? `${base}.${typeLower}.${suffix}.${sourceExt}`
    : `${base}.${typeLower}.${sourceExt}`;
}

/**
 * LIMU sub-object type codes (AFF spec §file-names): they never appear as
 * root objects — a `{parent}.{ptype}.{sub}.{stype}.{ext}` filename routes to
 * the parent object with `{sub}.{stype}` as its suffix.
 */
export const LIMU_SUBTYPES = new Set([
  'func',
  'reps',
  'cpub',
  'cpro',
  'cprt',
  'cpri',
  'sotr',
  'sotu',
]);

/**
 * The default source-file extension for an object type (`abap` fallback) —
 * used to decide whether a source-key suffix carries an explicit extension.
 */
export function gctsSourceExt(type: string): string {
  return TYPE_TO_SOURCE_EXT[mainType(type).toUpperCase()] ?? 'abap';
}

/** Source/companion extensions recognised by the spec file-name grammar. */
const KNOWN_SOURCE_EXTS = new Set([
  'abap',
  'asddls',
  'asdcls',
  'abdl',
  'acds',
  'csn',
  'xdp',
  'ddic',
  'properties',
  'xml',
]);

/** Every file extension the spec grammar can carry after the suffix. */
const KNOWN_FILE_EXTS = new Set([...KNOWN_SOURCE_EXTS, METADATA_EXTENSION]);

/**
 * Encode a companion file as a source-map key: bare `suffix` when the file
 * uses the type's default source extension, `{suffix}.{ext}` when it does
 * not (e.g. `z_func.func.json` → LIMU metadata, `texts.en.properties` →
 * translated texts). Symmetric with `splitSourceKey`.
 */
export function sourceKey(type: string, suffix: string, ext: string): string {
  return !ext || ext === gctsSourceExt(type) ? suffix : `${suffix}.${ext}`;
}

/**
 * Inverse of `sourceKey`: splits a source-map key into the filename suffix
 * and an optional extension override (`undefined` → the type's default).
 */
export function splitSourceKey(key: string): {
  suffix?: string;
  ext?: string;
} {
  if (key === 'main') return { suffix: undefined, ext: undefined };
  // Suffix-less companions with a non-default extension key as
  // `main.{ext}` (e.g. master texts `name.prog.properties`).
  if (key.startsWith('main.')) {
    const tail = key.slice(5);
    if (KNOWN_FILE_EXTS.has(tail)) return { suffix: undefined, ext: tail };
  }
  const dot = key.lastIndexOf('.');
  if (dot > 0 && KNOWN_FILE_EXTS.has(key.slice(dot + 1))) {
    return { suffix: key.slice(0, dot), ext: key.slice(dot + 1) };
  }
  return { suffix: key, ext: undefined };
}

/**
 * Parse an AFF/gCTS filename back into its components.
 *
 * Returns `undefined` if the filename does not look like a known AFF/gCTS
 * artefact — callers should skip unknown files (e.g. `README.md`).
 */
export function parseGctsFilename(
  filename: string,
): ParsedFormatFilename | undefined {
  // Fixed package filename.
  if (filename === PACKAGE_FILENAME) {
    return { name: '', type: 'DEVC', extension: METADATA_EXTENSION };
  }

  const parts = filename.split('.');
  if (parts.length < 3) return undefined;

  const extension = parts.at(-1)!;
  if (extension === METADATA_EXTENSION) return parseMetadataName(parts);
  if (extension === 'properties') return parsePropertiesName(parts);
  return parseSourceName(parts, extension);
}

/**
 * `{name}.{type}.json`, plus the DOCU companion form
 * `{name}.{type}.docu.json` which belongs to the parent object.
 */
function parseMetadataName(parts: string[]): ParsedFormatFilename {
  const docu = parts.at(-2) === 'docu' && parts.length >= 4;
  // `{parent}.{ptype}.{sub}.{stype}.json` — LIMU sub-object metadata is a
  // companion of the parent (`z_fugr.fugr.z_func.func.json`).
  const limu = parts.length >= 5 && LIMU_SUBTYPES.has(parts.at(-2)!);
  let offset = -2;
  if (docu) offset = -3;
  else if (limu) offset = -4;
  const parsed: ParsedFormatFilename = {
    name: parts.slice(0, offset).join('.'),
    type: parts.at(offset)!.toUpperCase(),
    extension: METADATA_EXTENSION,
  };
  if (docu) parsed.suffix = 'docu';
  else if (limu) parsed.suffix = `${parts.at(-3)}.${parts.at(-2)}`;
  return parsed;
}

/**
 * `.properties` text files have their own grammar:
 *   {name}.{type}.properties                        — master (3 parts)
 *   {name}.{type}.{lang}.properties                 — language (4 parts)
 *   {name}.{type}.{content_type}.{lang}.properties  — e.g. PROG
 *   selections/headings/texts (5 parts)
 * The composite suffix (`de`, `texts.en`) stays opaque — handlers map
 * suffixes to source keys via `suffixToSourceKey`.
 */
function parsePropertiesName(parts: string[]): ParsedFormatFilename {
  if (parts.length >= 5) {
    return {
      name: parts.slice(0, -4).join('.'),
      type: parts.at(-4)!.toUpperCase(),
      suffix: `${parts.at(-3)}.${parts.at(-2)}`,
      extension: 'properties',
    };
  }
  if (parts.length === 4) {
    return {
      name: parts.slice(0, -3).join('.'),
      type: parts.at(-3)!.toUpperCase(),
      suffix: parts.at(-2),
      extension: 'properties',
    };
  }
  return {
    name: parts.slice(0, -2).join('.'),
    type: parts.at(-2)!.toUpperCase(),
    extension: 'properties',
  };
}

/**
 * `{name}.{type}.{ext}` and `{name}.{type}.{suffix}.{ext}` source files —
 * a suffix is present iff there are ≥4 dot-segments.
 */
function parseSourceName(
  parts: string[],
  extension: string,
): ParsedFormatFilename | undefined {
  if (!KNOWN_SOURCE_EXTS.has(extension)) return undefined;
  // LIMU sub-object source: `{parent}.{ptype}.{sub}.{stype}.{ext}` —
  // the suffix carries `{sub}.{stype}` (e.g. `z_func.func`).
  if (parts.length >= 5 && LIMU_SUBTYPES.has(parts.at(-2)!)) {
    return {
      name: parts.slice(0, -4).join('.'),
      type: parts.at(-4)!.toUpperCase(),
      suffix: `${parts.at(-3)}.${parts.at(-2)}`,
      extension,
    };
  }
  if (parts.length >= 4) {
    return {
      name: parts.slice(0, -3).join('.'),
      type: parts.at(-3)!.toUpperCase(),
      suffix: parts.at(-2),
      extension,
    };
  }
  return {
    name: parts.slice(0, -2).join('.'),
    type: parts.at(-2)!.toUpperCase(),
    extension,
  };
}

/**
 * Translate an ADT object URI (e.g. `/sap/bc/adt/oo/classes/zcl_foo`) to
 * the AFF/gCTS on-disk path (e.g. `zcl_foo/zcl_foo.clas.json`).
 *
 * Matches the `adtUriToAbapGitPath` helper in the abapGit plugin.
 */
export function adtUriToGctsPath(uri: string): string | undefined {
  const ADT_PREFIX = '/sap/bc/adt/';
  if (!uri.startsWith(ADT_PREFIX)) return undefined;
  const tail = uri.slice(ADT_PREFIX.length);
  if (tail.length === 0) return undefined;

  // Common ADT URI → (type, name) table. Mirrors abapGit's mapping.
  const TABLE: Array<[RegExp, string]> = [
    [/^oo\/classes\/([^/]+)$/, 'CLAS'],
    [/^oo\/interfaces\/([^/]+)$/, 'INTF'],
    [/^programs\/programs\/([^/]+)$/, 'PROG'],
    [/^functions\/groups\/([^/]+)$/, 'FUGR'],
    [/^packages\/([^/]+)$/, 'DEVC'],
    [/^ddic\/domains\/([^/]+)$/, 'DOMA'],
    [/^ddic\/dataelements\/([^/]+)$/, 'DTEL'],
    [/^ddic\/structures\/([^/]+)$/, 'TABL'],
    [/^ddic\/tables\/([^/]+)$/, 'TABL'],
    [/^ddic\/tabletypes\/([^/]+)$/, 'TTYP'],
    [/^ddic\/ddl\/sources\/([^/]+)$/, 'DDLS'],
    [/^acm\/dcls\/sources\/([^/]+)$/, 'DCLS'],
  ];

  for (const [pattern, type] of TABLE) {
    const m = pattern.exec(tail);
    if (m) {
      const name = m[1];
      if (type === 'DEVC') return `${name.toLowerCase()}/${PACKAGE_FILENAME}`;
      return `${name.toLowerCase()}/${gctsFilename(name, type)}`;
    }
  }

  return undefined;
}

function mainType(type: string): string {
  return type.split('/')[0];
}
