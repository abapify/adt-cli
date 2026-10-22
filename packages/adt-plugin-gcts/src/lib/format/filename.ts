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
};

/** Metadata extension for all AFF/gCTS objects. */
export const METADATA_EXTENSION = 'json';

/** Fixed filename for package metadata (AFF / gCTS convention). */
export const PACKAGE_FILENAME = 'package.devc.json';

/**
 * Build the AFF/gCTS on-disk filename for an object.
 *
 * @param name     Object name (case preserved — AFF normalises to lowercase)
 * @param type     ABAP object type code (CLAS, INTF, ...)
 * @param kind     `"metadata"` (default) or `"source"`.
 * @param suffix   Optional sub-include suffix (e.g. `locals_def` for CLAS).
 */
export function gctsFilename(
  name: string,
  type: string,
  kind: 'metadata' | 'source' = 'metadata',
  suffix?: string,
): string {
  const base = name.toLowerCase();
  const typeLower = mainType(type).toLowerCase();
  if (kind === 'metadata') {
    return `${base}.${typeLower}.${METADATA_EXTENSION}`;
  }
  const ext = TYPE_TO_SOURCE_EXT[mainType(type).toUpperCase()] ?? 'abap';
  return suffix
    ? `${base}.${typeLower}.${suffix}.${ext}`
    : `${base}.${typeLower}.${ext}`;
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
]);

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
 * `{name}.{type}.json` metadata files, plus the DOCU companion form
 * `{name}.{type}.docu.json` which belongs to the parent object.
 */
function parseMetadataName(parts: string[]): ParsedFormatFilename {
  if (parts.at(-2) === 'docu' && parts.length >= 4) {
    return {
      name: parts.slice(0, -3).join('.'),
      type: parts.at(-3)!.toUpperCase(),
      suffix: 'docu',
      extension: METADATA_EXTENSION,
    };
  }
  return {
    name: parts.slice(0, -2).join('.'),
    type: parts.at(-2)!.toUpperCase(),
    extension: METADATA_EXTENSION,
  };
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
