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
import { splitSourceKey } from '../format/filename';

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
  /** Companion sources keyed by filename — `main` → the suffix-less file
   *  (`{name}.{type}.{ext}`); other keys are suffixes
   *  (`{name}.{type}.{key}.{typeExt}`, e.g. csnm's `model_inferred`); a key
   *  ending in a file extension selects that extension instead
   *  (`z_func.func.json`, `texts.en.properties`). */
  sources?: Record<string, string>;
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

/**
 * Companion-source emit for source-bearing types (`.abap`, `.acds`,
 * `.csn`, …): reads `obj.sources` — `main` emits the suffix-less file,
 * other keys emit `{name}.{type}.{suffix}.{ext}`. A key ending in a file
 * extension selects that extension instead of the type default
 * (`z_func.func.json` → LIMU metadata, `texts.en.properties` → texts).
 * Falls back to `obj.getSource()` as the single `main` source.
 */
export function genericGetSources(obj: GenericAffLike) {
  // Read from the same place genericSetSources writes: the payload's
  // `sources` map (plain objects) or `_pendingSources` (ADK objects
  // staged for check-in).
  const data = payloadOf(obj);
  const sources =
    (data?.sources as Record<string, string> | undefined) ??
    obj.sources ??
    (obj as { _pendingSources?: Record<string, string> })._pendingSources;
  const single = (obj as { _pendingSource?: string })._pendingSource;
  const merged = single ? { main: single, ...sources } : sources;
  if (merged && Object.keys(merged).length > 0) {
    return Object.entries(merged)
      .filter(([, content]) => !!content)
      .map(([key, content]) => ({
        ...splitSourceKey(key),
        content,
      }));
  }
  const getSource = (obj as { getSource?: () => string | Promise<string> })
    .getSource;
  const src = typeof getSource === 'function' ? getSource.call(obj) : undefined;
  return src ? [{ suffix: undefined, content: src }] : [];
}

/**
 * DOCU companion emit: `data.docu` carries the raw DOCU JSON document —
 * emitted as `{name}.{type}.docu.json` beside the main metadata file
 * (AFF spec: DOCU is companion metadata, not a standalone object).
 */
export function genericGetExtraFiles(type: string) {
  return (obj: GenericAffLike) => {
    const docu = payloadOf(obj)?.docu;
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

/**
 * Is `obj.data` assignable? Plain test doubles have a writable (or no)
 * `data` property — assignment creates/updates it. ADK objects expose
 * `data` as a method or a getter-only accessor (`AdkGenericObject`), where
 * assignment throws in strict mode; their mutable slot is `_data`.
 */
function dataIsWritable(obj: GenericAffLike): boolean {
  let cur: object | null = obj;
  while (cur) {
    const d = Object.getOwnPropertyDescriptor(cur, 'data');
    if (d) return 'value' in d ? d.writable !== false : d.set !== undefined;
    cur = Object.getPrototypeOf(cur) as object | null;
  }
  return true;
}

/** Deserialize side: stage companion sources back onto the object. */
export function genericSetSources(
  obj: GenericAffLike,
  sources: Record<string, string>,
): void {
  // On ADK objects `data` is a method or a getter-only accessor — the
  // mutable payload lives in `_data` (also written to `_pendingSources`,
  // which ADK check-in reads for source uploads).
  const raw = obj.data as unknown;
  const isAdkObject = typeof raw === 'function' || !dataIsWritable(obj);
  let data = payloadOf(obj);
  if (!data) {
    if (isAdkObject) {
      const priv = obj as { _data?: Record<string, unknown> };
      priv._data = priv._data ?? {};
      data = priv._data;
    } else {
      const fresh: Record<string, unknown> = {};
      (obj as { data?: Record<string, unknown> }).data = fresh;
      data = fresh;
    }
  }
  const { docu, ...rest } = sources;
  // DOCU companions are JSON documents, not source text — parse once,
  // re-emit via genericGetExtraFiles. A source key literally named
  // `docu.<ext>` still lands in the sources map (extension-aware).
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
  if (isAdkObject) {
    const pending = obj as { _pendingSources?: Record<string, string> };
    pending._pendingSources = { ...pending._pendingSources, ...rest };
  }
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
