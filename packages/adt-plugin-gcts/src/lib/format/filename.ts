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
  DDLS: 'asddls',
  DCLS: 'asdcls',
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
    return {
      name: '',
      type: 'DEVC',
      extension: METADATA_EXTENSION,
    };
  }

  const parts = filename.split('.');
  if (parts.length < 3) {
    return undefined;
  }

  const extension = parts[parts.length - 1];
  const maybeSuffix = parts.length >= 4 ? parts[parts.length - 2] : undefined;
  const nameParts = maybeSuffix
    ? parts.slice(0, parts.length - 3)
    : parts.slice(0, parts.length - 2);

  if (nameParts.length === 0) {
    return undefined;
  }

  // For 3-part filenames (name.type.ext) the "maybeSuffix" branch would
  // misclassify a 4-part filename vs a 3-part filename. Use a recognised
  // source extension to decide: if ext is 'json' there can't be a suffix.
  if (extension === METADATA_EXTENSION) {
    return {
      name:
        nameParts.length === 0
          ? ''
          : parts.slice(0, parts.length - 2).join('.'),
      type: parts[parts.length - 2].toUpperCase(),
      extension,
    };
  }

  // Source file — suffix is optional.
  const knownSourceExts = new Set(['abap', 'asddls', 'asdcls']);
  if (!knownSourceExts.has(extension)) {
    return undefined;
  }

  // Detect suffix: the part before the extension is a suffix only if the part
  // before THAT is a valid-looking lowercase type code. Use a narrow heuristic:
  // suffix present iff parts.length >= 4.
  if (parts.length >= 4) {
    return {
      name: parts.slice(0, parts.length - 3).join('.'),
      type: parts[parts.length - 3].toUpperCase(),
      suffix: parts[parts.length - 2],
      extension,
    };
  }

  return {
    name: parts.slice(0, parts.length - 2).join('.'),
    type: parts[parts.length - 2].toUpperCase(),
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
  const match = uri.match(/\/sap\/bc\/adt\/(.+)$/);
  if (!match) return undefined;
  const tail = match[1];

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
    const m = tail.match(pattern);
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
