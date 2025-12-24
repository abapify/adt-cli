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
