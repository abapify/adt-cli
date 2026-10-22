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
};

export function genericToMetadata(type: string) {
  const latest = String(latestAffVersion({ type }) ?? 1);
  return (obj: GenericAffLike): MinimalAff => {
    const data = obj.data ?? (obj as Record<string, unknown>);
    // Emit the payload's declared version when present (a v1 document
    // stays a valid v1 document); fresh objects emit the latest.
    const declared = (data as Record<string, unknown>).formatVersion;
    const version =
      typeof declared === 'string' || typeof declared === 'number'
        ? String(declared)
        : latest;
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
