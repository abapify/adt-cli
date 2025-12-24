/**
 * SARIF Formatter
 *
 * Outputs ATC findings in SARIF format for GitHub Code Scanning.
 */

import { writeFile } from 'fs/promises';
import type { AtcResult, AtcFinding } from '../types';

export async function outputSarifReport(
  result: AtcResult,
  outputFile: string,
  _targetName?: string,
): Promise<void> {
  // Transform ATC findings to SARIF format
  const rules = Array.from(
    new Map(
      result.findings.map((f) => [
        f.checkId,
        {
          id: f.checkId,
          name: f.checkTitle || f.checkId,
          shortDescription: { text: f.checkTitle || f.checkId },
          fullDescription: { text: f.checkTitle || f.checkId },
          defaultConfiguration: {
            level:
              f.priority === 1
                ? 'error'
                : f.priority === 2
                  ? 'warning'
                  : 'note',
          },
          properties: {
            tags: ['abap', 'code-quality'],
            precision: 'high',
          },
        },
      ]),
    ).values(),
  );

  const results = result.findings.map((finding: AtcFinding) => {
    const filePath = `src/${finding.objectType.toLowerCase()}/${finding.objectName.toLowerCase()}.${finding.objectType.toLowerCase()}`;

    // Parse line number from location if available
    const lineMatch = finding.location?.match(/start=(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;

    return {
      ruleId: finding.checkId,
      level:
        finding.priority === 1
          ? 'error'
          : finding.priority === 2
            ? 'warning'
            : 'note',
      message: { text: finding.messageText },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: filePath },
            region: {
              startLine: line,
              startColumn: 1,
            },
          },
        },
      ],
      partialFingerprints: {
        primaryLocationLineHash: `${finding.checkId}-${finding.objectName}-${line}`,
      },
    };
  });

  const sarifReport = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ABAP Test Cockpit',
            version: '1.0.0',
            informationUri:
              'https://help.sap.com/docs/ABAP_PLATFORM_NEW/c238d694b825421f940829321ffa326a/4ec5711c6e391014adc9fffe4e204223.html',
            rules: Array.from(rules),
          },
        },
        results,
      },
    ],
  };

  await writeFile(outputFile, JSON.stringify(sarifReport, null, 2));
  console.log(`\n📄 SARIF report written to: ${outputFile}`);
  console.log(
    `📊 ${result.totalFindings} issues exported for GitHub Code Scanning`,
  );
}
