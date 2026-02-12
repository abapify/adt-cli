/**
 * GitLab Code Quality Formatter
 *
 * Outputs ATC findings in GitLab Code Quality format.
 *
 * This formatter is a pure output formatter — it maps ATC findings to the
 * GitLab Code Quality JSON structure. Path resolution and line number
 * conversion are delegated to an optional FindingResolver.
 *
 * Without a resolver, the formatter produces PREFIX-style paths and raw
 * ATC (method-relative) line numbers. With a resolver (e.g., from
 * @abapify/adt-plugin-abapgit), it produces correct git paths and
 * file-relative line numbers.
 *
 * @example
 * ```typescript
 * // Without resolver (standalone CLI usage)
 * await outputGitLabCodeQuality(result, 'report.json');
 *
 * // With resolver (inside an abapgit repo)
 * import { createFindingResolver } from '@abapify/adt-plugin-abapgit';
 * const resolver = await createFindingResolver();
 * await outputGitLabCodeQuality(result, 'report.json', { resolver });
 * ```
 */

import { writeFile } from 'fs/promises';
import type { AtcResult, AtcFinding, FindingResolver } from '../types';

/**
 * Options for the GitLab Code Quality formatter
 */
export interface GitLabFormatterOptions {
  /** Optional resolver for path/line resolution (e.g., from abapgit plugin) */
  resolver?: FindingResolver;
}

// ── Extract method name from ATC location URI ───────────────────────────
// Format 1: /sap/bc/adt/oo/classes/zcl_foo/methods/my_method#start=21,0
// Format 2: ...#type=CLAS%2FOM;name=MY_METHOD;start=21

function extractMethodName(location?: string): string | undefined {
  if (!location) return undefined;
  const match =
    location.match(/\/methods\/(\w+)/i) || location.match(/[;?&]name=(\w+)/i);
  return match ? match[1].toLowerCase() : undefined;
}

// ── Construct PREFIX-style fallback path ─────────────────────────────────

function prefixPath(finding: AtcFinding): string {
  return `src/${finding.objectType.toLowerCase()}/${finding.objectName.toLowerCase()}.${finding.objectType.toLowerCase()}.abap`;
}

// ── Main formatter ──────────────────────────────────────────────────────

export async function outputGitLabCodeQuality(
  result: AtcResult,
  outputFile: string,
  options?: GitLabFormatterOptions,
): Promise<void> {
  const resolver = options?.resolver;

  // Transform ATC findings to GitLab Code Quality format
  const gitlabReport = await Promise.all(
    result.findings.map(async (finding: AtcFinding) => {
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

      // Parse ATC line number from location
      const lineMatch = finding.location?.match(/start=(\d+)/);
      const atcLine = lineMatch ? parseInt(lineMatch[1], 10) : 1;

      // Extract method name from ATC location URI
      const methodName = extractMethodName(finding.location);

      // Resolve path and line via plugin, or fall back to PREFIX-style
      let filePath: string;
      let fileLine: number;

      if (resolver) {
        const resolved = await resolver.resolve(
          finding.objectType,
          finding.objectName,
          atcLine,
          methodName,
        );
        if (resolved) {
          filePath = resolved.path;
          fileLine = resolved.line;
        } else {
          filePath = prefixPath(finding);
          fileLine = atcLine;
        }
      } else {
        filePath = prefixPath(finding);
        fileLine = atcLine;
      }

      // Create unique fingerprint
      const fingerprint = `${finding.checkId}-${finding.objectName}-${fileLine}`;

      return {
        description: finding.messageText,
        check_name: finding.checkTitle || finding.checkId,
        fingerprint,
        severity,
        location: {
          path: filePath,
          lines: {
            begin: fileLine,
            end: fileLine,
          },
        },
        // Extra fields for downstream processing
        ...(methodName && { method: methodName }),
        ...(finding.location && { atc_location: finding.location }),
      };
    }),
  );

  await writeFile(outputFile, JSON.stringify(gitlabReport, null, 2));
  console.log(`\n📄 GitLab Code Quality report written to: ${outputFile}`);
  console.log(`📊 ${result.totalFindings} issues exported`);
}
