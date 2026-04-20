/**
 * Shared types for format plugins (abapGit / gCTS).
 *
 * A {@link ClassArtifact} is the abstract, format-agnostic description of a
 * generated ABAP class. Format writers consume it and produce the on-disk
 * layout expected by the respective import flow.
 */

export type OutputFormat = 'abapgit' | 'gcts';

export interface ClassArtifact {
  /** Uppercase class name, e.g. 'ZCL_PETSTORE3_CLIENT'. */
  className: string;
  /** The printed ABAP source (main class include). */
  mainSource: string;
  /** Optional test-class source. If present, must be written alongside. */
  testSource?: string;
  /** Optional local include (types) source. */
  localsDefSource?: string;
  /** Optional local include (implementation) source — for helper classes emitted alongside the main class. */
  localsImpSource?: string;
  /** Optional description used in the .clas.xml metadata (DESCRIPT). */
  description?: string;
  /** ADT language key, default 'E'. */
  language?: string;
}

export interface WriteResult {
  /** Relative paths written, sorted, forward-slash normalised. */
  files: readonly string[];
}
