/**
 * gCTS / AFF format type definitions.
 *
 * The gCTS on-disk layout is essentially the layout documented by the AFF
 * project (`SAP/abap-file-formats`): object-type subdirectory, JSON metadata,
 * source files with AFF-specific extensions (`.abap`, `.acds`, ...).
 *
 * This plugin intentionally targets the AFF format so that a single plugin
 * id (`gcts`) covers both gCTS-exported repos and AFF-exported repos. See
 * `AGENTS.md` for the rationale and the open question tracked in
 * `docs/roadmap/epics/e06-gcts-format-plugin.md`.
 */

/** Header common to every AFF/gCTS metadata JSON file. */
export interface GctsHeader {
  /** Legacy header version; current AFF schemas put formatVersion at the top level. */
  formatVersion?: string;
  /** Description of the object. */
  description?: string;
  /** Master language (ISO code, lowercase — e.g. `en`). */
  originalLanguage?: string;
  /** ABAP language version (e.g. `standard`, `cloudDevelopment`). */
  abapLanguageVersion?: string;
}

/**
 * Top-level shape of an AFF/gCTS metadata JSON file.
 *
 * Concrete handlers tighten this with per-type payload shapes.
 *
 * A format version is mandatory: either the current top-level `formatVersion`
 * or the legacy `header.formatVersion`.
 */
export type GctsMetadata<_TPayload extends object = object> =
  | {
      /** Current AFF format version. */
      formatVersion: string;
      /** Format header (mandatory on every file). */
      header: GctsHeader;
    }
  | {
      formatVersion?: string;
      /** Legacy form: the version lives in the header. */
      header: GctsHeader & { formatVersion: string };
    };

/** Convenience helper for concrete metadata shapes. */
export type WithHeader<TPayload extends object> = {
  header: GctsHeader;
} & TPayload;
