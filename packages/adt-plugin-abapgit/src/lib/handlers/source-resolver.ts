import { FormatMaterializationError } from '@abapify/adt-plugin';
import type { SerializedFile } from './base';

type SourceObject = { getSource?: () => Promise<string> | string };

/**
 * Resolve the `main` source component for an AFF source handler.
 *
 * If `sources` is supplied, only the `main` key is accepted — any other
 * key throws `FORMAT_SOURCE_COMPONENT_UNSUPPORTED`. When `sources` is
 * absent, falls back to `object.getSource()`.
 */
export async function resolveMainSource(
  object: SourceObject,
  sources: Readonly<Record<string, string | undefined>> | undefined,
  typeLabel: string,
): Promise<string | undefined> {
  if (sources !== undefined) {
    const keys = Object.keys(sources);
    if (keys.some((key) => key !== 'main')) {
      throw new FormatMaterializationError(
        'FORMAT_SOURCE_COMPONENT_UNSUPPORTED',
        `${typeLabel} only supports the 'main' source component; received ${keys.join(', ')}.`,
      );
    }
    return sources.main;
  }
  return typeof object.getSource === 'function' ? await object.getSource() : '';
}

/**
 * Build an AFF JSON metadata file. `extra` fields are merged at the
 * top level alongside `formatVersion` and `header`.
 */
export function buildAffJson(
  description: string,
  originalLanguage: string,
  abapLanguageVersion: string | undefined,
  extra: Record<string, unknown> = {},
): string {
  return `${JSON.stringify(
    {
      formatVersion: '1',
      header: {
        description,
        originalLanguage: originalLanguage.toLowerCase(),
        ...(abapLanguageVersion ? { abapLanguageVersion } : {}),
      },
      ...extra,
    },
    null,
    2,
  )}\n`;
}

/**
 * Create the source file for an AFF handler if the source should be
 * included. Returns an empty array if the source is absent or empty.
 */
export function createAffSourceFile(
  ctx: {
    getObjectName: (obj: unknown) => string;
    fileExtension: string;
    createFile: (path: string, content: string) => SerializedFile;
  },
  params: {
    object: unknown;
    source: string | undefined;
    suppliedSource: string | undefined;
    sourceExt: string;
  },
): SerializedFile[] {
  if (params.source === undefined) return [];
  if (params.suppliedSource === undefined && params.source === '') return [];
  const name = ctx.getObjectName(params.object);
  return [
    ctx.createFile(
      `${name}.${ctx.fileExtension}.${params.sourceExt}`,
      params.source,
    ),
  ];
}

/**
 * Full serialize implementation for AFF source handlers.
 *
 * Handles the complete source+metadata file layout in one call:
 *   `<name>.<ext>.<sourceExt>` — source text (when included)
 *   `<name>.<jsonExt>` — metadata JSON
 *
 * `extra` is merged into the JSON body for handler-specific fields
 * (e.g. SRVD's `generalInformation`, DDLS's `sourceOrigin`).
 */
export async function serializeAffSource(
  object: SourceObject & {
    name: string;
    description?: string;
    originalLanguage?: string;
    abapLanguageVersion?: string;
  },
  ctx: {
    getObjectName: (obj: unknown) => string;
    fileExtension: string;
    createFile: (path: string, content: string) => SerializedFile;
  },
  options: Readonly<Record<string, string | undefined>> | undefined,
  config: {
    typeLabel: string;
    sourceExt: string;
    jsonExt: string;
    extra?: Record<string, unknown>;
  },
): Promise<SerializedFile[]> {
  const source = await resolveMainSource(object, options, config.typeLabel);
  const name = ctx.getObjectName(object);
  return [
    ...createAffSourceFile(ctx, {
      object,
      source,
      suppliedSource: options?.main,
      sourceExt: config.sourceExt,
    }),
    ctx.createFile(
      `${name}.${config.jsonExt}`,
      buildAffJson(
        object.description || String(object.name ?? ''),
        object.originalLanguage ?? 'en',
        object.abapLanguageVersion,
        config.extra,
      ),
    ),
  ];
}

/**
 * Shared `getSource` handler function for source-driven AFF objects
 * (BDEF, SRVD). Delegates to `obj.getSource()` when available.
 */
export function affGetSource(obj: SourceObject): Promise<string> {
  return typeof obj?.getSource === 'function'
    ? Promise.resolve(obj.getSource())
    : Promise.resolve('');
}

/**
 * Shared `fromAbapGit` handler function for source-driven AFF objects.
 * Extracts the uppercased name from the SKEY envelope.
 */
export function affFromAbapGit(SKEY: { NAME?: string } | undefined): {
  name: string;
} {
  return { name: String(SKEY?.NAME ?? '').toUpperCase() };
}

/**
 * Shared `setSources` handler function for source-driven AFF objects.
 * Stores the `main` source on a `_pendingSource` property.
 */
export function affSetSources(obj: unknown, sources: { main?: string }): void {
  if (sources.main !== undefined) {
    (obj as unknown as { _pendingSource: string })._pendingSource =
      sources.main;
  }
}

/**
 * Shared `fromAffJson` handler function for source-driven AFF objects.
 * Extracts the object name from the JSON header or falls back to the
 * filename-derived name passed in. The AFF JSON format stores the
 * description in `header.description` and the original language in
 * `header.originalLanguage`. Both are preserved for round-trip fidelity.
 */
export function affFromAffJson(
  json: Record<string, unknown>,
  fallbackName: string,
): {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
} {
  const header = json.header as
    | {
        description?: string;
        originalLanguage?: string;
        abapLanguageVersion?: string;
      }
    | undefined;
  return {
    name: fallbackName,
    description: header?.description,
    originalLanguage: header?.originalLanguage,
    abapLanguageVersion: header?.abapLanguageVersion,
  };
}

/**
 * Dual-format serialize for objects that support both AFF JSON and legacy XML.
 *
 * When `options.format === 'legacy'`, produces a legacy abapGit XML metadata
 * file (via `ctx.toAbapGitXml`) plus the source file. Otherwise (default or
 * `format === 'aff'`), delegates to `serializeAffSource` to produce the AFF
 * JSON sidecar plus source.
 */
export async function serializeDualFormat(
  object: SourceObject & {
    name: string;
    description?: string;
    originalLanguage?: string;
    abapLanguageVersion?: string;
  },
  ctx: {
    getObjectName: (obj: unknown) => string;
    fileExtension: string;
    createFile: (path: string, content: string) => SerializedFile;
    toAbapGitXml: (obj: unknown) => string;
  },
  options: import('@abapify/adt-plugin').FormatSerializeOptions | undefined,
  config: {
    typeLabel: string;
    sourceExt: string;
    jsonExt: string;
    extra?: Record<string, unknown>;
  },
): Promise<SerializedFile[]> {
  // Legacy XML format: produce .xml metadata + source file
  if (options?.format === 'legacy') {
    const source = await resolveMainSource(
      object,
      options?.sources,
      config.typeLabel,
    );
    const name = ctx.getObjectName(object);
    const files: SerializedFile[] = [];
    // Source file — preserve explicitly supplied empty source (authoritative
    // sources contract). Only skip when source is genuinely absent.
    if (source !== undefined) {
      files.push(
        ctx.createFile(
          `${name}.${ctx.fileExtension}.${config.sourceExt}`,
          source,
        ),
      );
    }
    // Legacy XML metadata
    files.push(
      ctx.createFile(
        `${name}.${ctx.fileExtension}.xml`,
        ctx.toAbapGitXml(object),
      ),
    );
    return files;
  }

  // Default: AFF JSON format
  return serializeAffSource(object, ctx, options?.sources, config);
}
