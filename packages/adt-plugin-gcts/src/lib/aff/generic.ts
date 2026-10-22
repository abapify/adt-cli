/**
 * Schema-aware generic AFF emit/parse — zero workspace deps.
 *
 * `genericToMetadata` builds the `{formatVersion, header}` envelope for a
 * type (version pinned to its latest schema) plus only the schema-
 * declared top-level body properties the payload carries — arbitrary
 * payload fields are NOT copied. `genericFromMetadata` is its inverse:
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
};

/**
 * Payload extraction that works for both plain objects (`data` is a
 * record) and real ADK objects (`data` is an async method; the loaded
 * payload lives behind the `dataSync` getter / `_data` field). Returns
 * `undefined` when no usable payload is found — callers fall back to
 * treating the object itself as the record.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Narrow to string/number; objects never reach `String()` coercion. */
function str(v: unknown): string | undefined {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;
}

/** ADK-object payload: `dataSync` getter (throws unloaded) or `_data`. */
function adkPayloadOf(
  obj: GenericAffLike,
): Record<string, unknown> | undefined {
  try {
    const sync = (obj as { dataSync?: unknown }).dataSync;
    if (isRecord(sync)) return sync;
  } catch {
    /* not loaded */
  }
  const priv = (obj as { _data?: unknown })._data;
  return isRecord(priv) ? priv : undefined;
}

export function payloadOf(
  obj: GenericAffLike,
): Record<string, unknown> | undefined {
  const d = obj.data as unknown;
  if (isRecord(d)) return d;
  if (typeof d === 'function') return adkPayloadOf(obj);
  return undefined;
}

export function genericToMetadata(type: string) {
  return (obj: GenericAffLike): MinimalAff => {
    const data = payloadOf(obj) ?? (obj as Record<string, unknown>);
    // Emit the payload's declared version when present (a v1 document
    // stays a valid v1 document); fresh objects emit the latest schema
    // version — resolved lazily so registration never touches the fs.
    const declared = (data as Record<string, unknown>).formatVersion;
    const version =
      typeof declared === 'string' || typeof declared === 'number'
        ? String(declared)
        : String(latestAffVersion({ type }) ?? '1');
    const bodyProps = affBodyProps({
      type,
      version: Number.isNaN(Number(version)) ? undefined : Number(version),
    });
    const meta: MinimalAff = {
      formatVersion: version,
      header: {
        description: str(data.description) ?? obj.description ?? obj.name,
        originalLanguage: (
          obj.originalLanguage ??
          str(data.originalLanguage) ??
          str(data.language) ??
          str(data.masterLanguage) ??
          'en'
        ).toLowerCase(),
      },
    };
    const abapLang = str(data.abapLanguageVersion) ?? obj.abapLanguageVersion;
    if (abapLang && abapLang !== 'standard') {
      meta.header.abapLanguageVersion = abapLang;
    }
    for (const prop of bodyProps) {
      const value = (data as Record<string, unknown>)[prop];
      if (value !== undefined) meta[prop] = value;
    }
    return meta;
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
