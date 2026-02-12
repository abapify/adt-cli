/**
 * GitLab Code Quality Formatter
 *
 * Outputs ATC findings in GitLab Code Quality format.
 */

import { writeFile } from 'fs/promises';
import type { AtcResult, AtcFinding } from '../types';

export async function outputGitLabCodeQuality(
  result: AtcResult,
  outputFile: string,
): Promise<void> {
  // Transform ATC findings to GitLab Code Quality format
  const gitlabReport = result.findings.map((finding: AtcFinding) => {
    // Map ATC priority to GitLab severity
    let severity: string;
    switch (finding.priority) {
      case 1:
        severity = 'blocker';
        break;
      case 2:
        severity = 'major';
        break;
      case 3:
        severity = 'minor';
        break;
      default:
        severity = 'info';
        break;
    }

    // Extract file path from object reference (abapgit format: src/<type>/<name>.<type>.abap)
    const filePath = `src/${finding.objectType.toLowerCase()}/${finding.objectName.toLowerCase()}.${finding.objectType.toLowerCase()}.abap`;

    // Parse line number from location if available
    const lineMatch = finding.location?.match(/start=(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;

    // Create unique fingerprint for the finding
    const fingerprint = `${finding.checkId}-${finding.objectName}-${line}`;

    // Extract method name from ATC location URI if present
    // e.g., /sap/bc/adt/oo/classes/zcl_foo/methods/my_method#start=21,0
    const methodMatch = finding.location?.match(/\/methods\/(\w+)/i);
    const methodName = methodMatch ? methodMatch[1].toLowerCase() : undefined;

    return {
      description: finding.messageText,
      check_name: finding.checkTitle || finding.checkId,
      fingerprint,
      severity,
      location: {
        path: filePath,
        lines: {
          begin: line,
          end: line,
        },
      },
      // Extra fields for downstream processing (path/line resolution)
      ...(methodName && { method: methodName }),
      ...(finding.location && { atc_location: finding.location }),
    };
  });

  await writeFile(outputFile, JSON.stringify(gitlabReport, null, 2));
  console.log(`\n📄 GitLab Code Quality report written to: ${outputFile}`);
  console.log(`📊 ${result.totalFindings} issues exported`);
}
