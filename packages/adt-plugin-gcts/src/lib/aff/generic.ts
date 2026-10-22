/**
 * Schema-aware generic AFF emit/parse — zero workspace deps.
 *
 * `genericToMetadata` builds the `{formatVersion, header}` envelope for a
 * type (version pinned to its latest schema) plus every top-level body
 * property the payload carries. `genericFromMetadata` is its inverse:
 * header → ADK projection, body fields spread into the payload so they
 * land back on `obj.data` — enabling metadata round-trips for all
 * wave2-registered types.
 */

import { affBodyProps, latestAffVersion } from './schemas';

/** Minimal AFF metadata shape shared by all types. */
export interface MinimalAff {
  formatVersion: string;
  header: {
    description: string;
    originalLanguage: string;
    abapLanguageVersion?: string;
  };
  [key: string]: unknown;
}

export type GenericAffLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  /** Raw payload fields (deserialized AFF body, ADT response, …). */
  data?: Record<string, unknown>;
  /** Companion sources keyed by file suffix — `main` → no suffix
   *  (`{name}.{type}.{ext}`), any other key becomes the middle segment
   *  (`{name}.{type}.{key}.{ext}`, e.g. csnm's `model_inferred`). */
  sources?: Record<string, string>;
};

export function genericToMetadata(type: string) {
  const latest = String(latestAffVersion({ type }) ?? 1);
  return (obj: GenericAffLike): MinimalAff => {
    const data = obj.data ?? (obj as Record<string, unknown>);
    // Emit the payload's declared version when present (a v1 document
    // stays a valid v1 document); fresh objects emit the latest.
    const declared = (data as Record<string, unknown>).formatVersion;
    const version =
      declared !== undefined && declared !== null ? String(declared) : latest;
    const bodyProps = affBodyProps({
      type,
      version: Number.isNaN(Number(version)) ? undefined : Number(version),
    });
    const meta: MinimalAff = {
      formatVersion: version,
      header: {
        description: obj.description ?? obj.name ?? '',
        originalLanguage: (obj.originalLanguage ?? '').toLowerCase(),
      },
    };
    if (obj.abapLanguageVersion) {
      meta.header.abapLanguageVersion = obj.abapLanguageVersion;
    }
    for (const prop of bodyProps) {
      const value = (data as Record<string, unknown>)[prop];
      if (value !== undefined) meta[prop] = value;
    }
    return meta;
  };
}

/**
 * Companion-source emit for source-bearing types (`.abap`, `.acds`,
 * `.csn`, …): reads `obj.sources` — `main` emits the suffix-less file,
 * other keys emit `{name}.{type}.{suffix}.{ext}`. Falls back to
 * `obj.getSource()` as the single `main` source.
 */
export function genericGetSources(obj: GenericAffLike) {
  if (obj.sources && Object.keys(obj.sources).length > 0) {
    return Object.entries(obj.sources)
      .filter(([, content]) => !!content)
      .map(([key, content]) => ({
        suffix: key === 'main' ? undefined : key,
        content,
      }));
  }
  const src =
    typeof (obj as { getSource?: () => string | Promise<string> }).getSource ===
    'function'
      ? (obj as { getSource: () => string | Promise<string> }).getSource()
      : undefined;
  return src ? [{ suffix: undefined, content: src }] : [];
}

/**
 * DOCU companion emit: `data.docu` carries the raw DOCU JSON document —
 * emitted as `{name}.{type}.docu.json` beside the main metadata file
 * (AFF spec: DOCU is companion metadata, not a standalone object).
 */
export function genericGetExtraFiles(type: string) {
  return (obj: GenericAffLike) => {
    const docu = obj.data?.docu;
    if (docu === undefined || docu === null) return [];
    const name = (obj.name ?? '').toLowerCase();
    // Parsed documents re-serialize; a raw string (unparseable JSON kept
    // by genericSetSources) re-emits verbatim instead of double-encoding.
    const content =
      typeof docu === 'string' ? docu : JSON.stringify(docu, null, 2) + '\n';
    return [
      {
        path: `${name}.${type.toLowerCase()}.docu.json`,
        content,
      },
    ];
  };
}

/** Deserialize side: stage companion sources back onto the object. */
export function genericSetSources(
  obj: GenericAffLike,
  sources: Record<string, string>,
): void {
  const data = (obj.data ??= {});
  const { docu, ...rest } = sources;
  // DOCU companions are JSON documents, not source text — parse once,
  // re-emit via genericGetExtraFiles.
  if (docu !== undefined) {
    try {
      data.docu = JSON.parse(docu) as unknown;
    } catch {
      data.docu = docu;
    }
  }
  data.sources = {
    ...(data.sources as Record<string, string> | undefined),
    ...rest,
  };
}

export function genericFromMetadata(meta: MinimalAff) {
  const { formatVersion, header, ...body } = meta;
  return {
    name: '',
    description: header.description,
    language: header.originalLanguage?.toUpperCase(),
    masterLanguage: header.originalLanguage?.toUpperCase(),
    // formatVersion stays in the payload — a v1 document must re-emit as
    // v1, not silently upgrade to a schema version it predates.
    formatVersion,
    ...(header.abapLanguageVersion
      ? { abapLanguageVersion: header.abapLanguageVersion }
      : {}),
    ...body,
  };
}
