/**
 * ATC Types
 *
 * Types for ATC command and formatters.
 */

/**
 * ATC Finding with flattened object info
 */
export interface AtcFinding {
  checkId: string;
  checkTitle: string;
  messageId: string;
  priority: number;
  messageText: string;
  objectUri: string;
  objectType: string;
  objectName: string;
  location?: string;
  findingUri?: string;
}

/**
 * ATC Result summary
 */
export interface AtcResult {
  checkVariant: string;
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: AtcFinding[];
}

/**
 * Output format options
 */
export type OutputFormat = 'console' | 'json' | 'gitlab' | 'sarif';

/**
 * Resolved location for a finding in the git repository
 */
export interface ResolvedLocation {
  /** Git-relative file path (e.g., src/zpackage/zpackage_clas/zcl_foo.clas.abap) */
  path: string;
  /** File-relative line number (1-based) */
  line: number;
}

/**
 * Finding resolver interface
 *
 * Resolves ATC finding locations (object type/name + method-relative line)
 * to actual git file paths and file-relative line numbers.
 *
 * Implementations are format-specific (e.g., abapgit with FULL/PREFIX folder logic).
 * The resolver is optional — without it, formatters use raw ATC data.
 *
 * @example
 * ```typescript
 * // Load resolver from a plugin
 * import { createFindingResolver } from '@abapify/adt-plugin-abapgit';
 * const resolver = await createFindingResolver();
 *
 * // Use with gitlab formatter
 * await outputGitLabCodeQuality(result, outputFile, { resolver });
 * ```
 */
export interface FindingResolver {
  /**
   * Resolve a finding's location to a git file path and file-relative line number.
   *
   * @param objectType - ABAP object type (e.g., 'CLAS', 'INTF', 'PROG')
   * @param objectName - ABAP object name (e.g., 'ZCL_MY_CLASS')
   * @param atcLine    - Method-relative line number from ATC
   * @param methodName - Method name (extracted from ATC location URI), if known
   * @returns Resolved path and line, or null if resolution not possible
   */
  resolve(
    objectType: string,
    objectName: string,
    atcLine: number,
    methodName?: string,
  ): Promise<ResolvedLocation | null>;
}
