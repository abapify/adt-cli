/**
 * Export Plugin Types
 */

// Re-export FileTree from adt-plugin (canonical definition)
export type { FileTree } from '@abapify/adt-plugin';

/**
 * Export result statistics
 */
export interface ExportResult {
  /** Number of objects discovered */
  discovered: number;
  /** Number of objects saved */
  saved: number;
  /** Number of objects activated */
  activated: number;
  /** Number of objects skipped */
  skipped: number;
  /** Number of objects failed */
  failed: number;
  /** Detailed object results */
  objects: ExportObjectResult[];
  /** Package verification results (only when --verify is used) */
  verification?: VerificationResult;
}

/**
 * Individual object export result
 */
export interface ExportObjectResult {
  type: string;
  name: string;
  status: 'saved' | 'activated' | 'skipped' | 'failed';
  error?: string;
}

/**
 * Package verification result
 */
export interface VerificationResult {
  /** Total objects verified */
  total: number;
  /** Objects in the correct package */
  correct: number;
  /** Objects in the wrong package */
  mismatched: number;
  /** Objects that couldn't be verified (e.g., load failed) */
  errors: number;
  /** Detailed per-object results */
  details: VerificationDetail[];
}

/**
 * Per-object verification detail
 */
export interface VerificationDetail {
  type: string;
  name: string;
  expectedPackage: string;
  actualPackage?: string;
  status: 'correct' | 'mismatched' | 'error';
  error?: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Source directory containing serialized files */
  sourcePath: string;
  /** Format plugin name (e.g., 'abapgit', '@abapify/adt-plugin-abapgit') */
  format: string;
  /** Transport request for changes */
  transportRequest?: string;
  /** Target package (for new objects) */
  targetPackage?: string;
  /** Filter by object types */
  objectTypes?: string[];
  /** Dry run - don't actually save */
  dryRun?: boolean;
  /** Enable debug output */
  debug?: boolean;
}
