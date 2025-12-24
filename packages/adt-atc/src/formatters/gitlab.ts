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

    // Extract file path from object reference
    const filePath = `src/${finding.objectType.toLowerCase()}/${finding.objectName.toLowerCase()}.${finding.objectType.toLowerCase()}`;

    // Parse line number from location if available
    const lineMatch = finding.location?.match(/start=(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;

    // Create unique fingerprint for the finding
    const fingerprint = `${finding.checkId}-${finding.objectName}-${line}`;

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
    };
  });

  await writeFile(outputFile, JSON.stringify(gitlabReport, null, 2));
  console.log(`\n📄 GitLab Code Quality report written to: ${outputFile}`);
  console.log(`📊 ${result.totalFindings} issues exported`);
}
