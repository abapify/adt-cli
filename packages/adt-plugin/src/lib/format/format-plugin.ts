/**
 * FormatPlugin — interface for serialization-format plugins (abapGit, gCTS, AFF, …).
 *
 * A format plugin owns:
 *   - a stable CLI id (used with `--format <id>`)
 *   - the set of ABAP object types it can serialize
 *   - a `getHandler(type)` accessor returning a `FormatHandler` for a specific
 *     ABAP object type (the handler knows how to turn an ADK object into files
 *     and vice versa)
 *   - an optional `parseFilename(name)` helper (format-specific naming
 *     convention — e.g. `zcl_foo.clas.xml` for abapGit)
 *
 * Format plugins are registered through the `format-registry` module. Packages
 * that implement a format (such as `@abapify/adt-plugin-abapgit`) call
 * `registerFormatPlugin(...)` as a side-effect of being imported, so pulling in
 * the package is enough to make `--format <id>` work. Consumers (export, diff,
 * import, checkout) MUST look plugins up through `getFormatPlugin(id)` — they
 * must NOT import format packages directly.
 */

/**
 * Serialized output file produced by a handler.
 *
 * Identical shape to the pre-existing `SerializedFile` in
 * `@abapify/adt-plugin-abapgit` so migration is a pure rename.
 */
export interface SerializedFile {
  /** Relative path from the object directory (e.g. `zcl_foo.clas.xml`). */
  path: string;
  /** File contents. */
  content: string;
  /** Optional encoding (default: utf-8). */
  encoding?: BufferEncoding;
}

/**
 * Result of parsing a format-specific filename.
 *
 * Different formats use different naming conventions; this is the minimum
 * info any consumer needs (the object name, the SAP object type and the file
 * extension).
 */
export interface ParsedFormatFilename {
  /** SAP object name (e.g. `ZCL_FOO`). */
  name: string;
  /** SAP object type code (e.g. `CLAS`, `INTF`). */
  type: string;
  /** Optional per-file suffix (e.g. `testclasses` for a CLAS sub-include). */
  suffix?: string;
  /** File extension without the dot (e.g. `xml`, `abap`). */
  extension: string;
}

/**
 * Minimal schema surface used by format consumers.
 *
 * Both `parse` and `build` intentionally use `unknown` to avoid coupling
 * `@abapify/adt-plugin` to any particular XML schema library (ts-xsd, speci,
 * …). Concrete handlers may narrow this with a typed schema internally.
 */
export interface FormatHandlerSchema {
  parse(xml: string): unknown;
  build(data: unknown, options?: { pretty?: boolean }): string;
}

/**
 * Handler for a single ABAP object type within a format.
 *
 * Kept intentionally abstract — the concrete handler implementation in e.g.
 * `adt-plugin-abapgit` is a structural superset of this interface, so there
 * is no need to convert between them.
 */
export interface FormatHandler {
  /** ABAP object type code (e.g. `CLAS`). */
  readonly type: string;
  /** File extension associated with the object type (e.g. `clas`). */
  readonly fileExtension: string;
  /** Schema for parsing/building the handler's XML representation. */
  readonly schema: FormatHandlerSchema;
  /** Optional map from abapGit file suffix to source key. */
  readonly suffixToSourceKey?: Record<string, string>;
  /** Serialize an ADK object to one or more files. */
  serialize(object: unknown): Promise<SerializedFile[]>;
  /**
   * Map format-specific XML values back to ADK data. Present only on
   * handlers that support bidirectional (git → SAP) workflows.
   */
  fromAbapGit?(values: unknown): { name: string } & Record<string, unknown>;
  /** Set resolved source files on an ADK object during deserialization. */
  setSources?(object: unknown, sources: Record<string, string>): void;
}

/**
 * A serialization-format plugin.
 */
export interface FormatPlugin {
  /** Stable id used on the CLI (`--format <id>`). */
  readonly id: string;
  /** Human-readable description shown in help output. */
  readonly description: string;
  /** SAP object types this plugin can serialize (snapshot — may be computed). */
  readonly supportedTypes: ReadonlyArray<string>;
  /** Look up the handler for a given ABAP object type. */
  getHandler(type: string): FormatHandler | undefined;
  /** Parse a format-specific filename, if the format defines one. */
  parseFilename?(filename: string): ParsedFormatFilename | undefined;
}
