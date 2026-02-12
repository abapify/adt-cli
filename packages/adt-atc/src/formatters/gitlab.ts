/**
 * GitLab Code Quality Formatter
 *
 * Outputs ATC findings in GitLab Code Quality format.
 *
 * Handles two key transformations:
 * 1. Path resolution: ATC uses PREFIX-style paths (src/clas/foo.clas.abap)
 *    but repos with FULL folder logic have paths like
 *    src/zpackage/zpackage_clas/foo.clas.abap. We scan src/ to find the real path.
 * 2. Line conversion: ATC reports method-relative line numbers for class methods.
 *    We extract the method name from the ATC location URI and find the METHOD
 *    statement in the file to compute the file-relative line number.
 */

import { writeFile, readFile } from 'fs/promises';
import { execSync } from 'child_process';
import { basename } from 'path';
import type { AtcResult, AtcFinding } from '../types';

// ── File path resolution ────────────────────────────────────────────────
// Build a filename → git-path lookup by scanning src/

function buildFilenameLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  try {
    const files = execSync(
      'find src/ -type f \\( -name "*.abap" -o -name "*.xml" \\)',
      {
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
      },
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    for (const f of files) {
      const name = basename(f);
      if (!lookup.has(name)) {
        lookup.set(name, f);
      }
    }
  } catch {
    // src/ might not exist (e.g. running outside a repo)
  }
  return lookup;
}

// ── Line number conversion ──────────────────────────────────────────────
// ATC line numbers for class methods are relative to the METHOD statement.
// We parse the file to find METHOD start lines and convert.

interface MethodRange {
  name: string;
  startLine: number;
  length: number;
}

// Cache: gitPath → file lines
const fileCache = new Map<string, string[]>();

async function getFileLines(gitPath: string): Promise<string[] | null> {
  if (fileCache.has(gitPath)) return fileCache.get(gitPath)!;
  try {
    const content = await readFile(gitPath, 'utf8');
    const lines = content.split('\n');
    fileCache.set(gitPath, lines);
    return lines;
  } catch {
    return null;
  }
}

function parseMethodRanges(lines: string[]): MethodRange[] {
  const ranges: MethodRange[] = [];
  let currentMethod: string | null = null;
  let methodStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const methodMatch = lines[i].match(/^\s*METHOD\s+(\w+)/i);
    if (methodMatch) {
      currentMethod = methodMatch[1].toLowerCase();
      methodStart = i + 1; // 1-based
    }
    if (currentMethod && /^\s*ENDMETHOD/i.test(lines[i])) {
      const endLine = i + 1;
      ranges.push({
        name: currentMethod,
        startLine: methodStart,
        length: endLine - methodStart + 1,
      });
      currentMethod = null;
    }
  }
  return ranges;
}

async function convertLineNumber(
  atcLine: number,
  methodName: string | undefined,
  gitPath: string,
): Promise<number> {
  if (!gitPath.endsWith('.clas.abap')) return atcLine;

  const lines = await getFileLines(gitPath);
  if (!lines) return atcLine;

  const ranges = parseMethodRanges(lines);
  if (ranges.length === 0) return atcLine;

  // Best case: method name known from ATC location URI
  if (methodName) {
    const method = ranges.find((r) => r.name === methodName.toLowerCase());
    if (method) return method.startLine + atcLine - 1;
  }

  // Single method: use it
  if (ranges.length === 1) return ranges[0].startLine + atcLine - 1;

  // Heuristic: smallest method where atcLine fits
  const candidates = ranges
    .filter((r) => atcLine <= r.length)
    .sort((a, b) => a.length - b.length);
  if (candidates.length > 0) return candidates[0].startLine + atcLine - 1;

  return atcLine;
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
): Promise<void> {
  // Build filename lookup from src/ tree (supports FULL folder logic)
  const filenameLookup = buildFilenameLookup();
  if (filenameLookup.size > 0) {
    console.log(`📂 Resolved ${filenameLookup.size} files in src/`);
  }

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

      // Resolve file path: try src/ tree lookup, fall back to PREFIX
      const fallback = prefixPath(finding);
      const expectedFilename = basename(fallback);
      const resolvedPath = filenameLookup.get(expectedFilename) || fallback;

      // Parse method-relative line number from ATC location
      const lineMatch = finding.location?.match(/start=(\d+)/);
      const atcLine = lineMatch ? parseInt(lineMatch[1], 10) : 1;

      // Extract method name and convert to file-relative line
      const methodName = extractMethodName(finding.location);
      const fileLine = await convertLineNumber(
        atcLine,
        methodName,
        resolvedPath,
      );

      // Create unique fingerprint using resolved line
      const fingerprint = `${finding.checkId}-${finding.objectName}-${fileLine}`;

      return {
        description: finding.messageText,
        check_name: finding.checkTitle || finding.checkId,
        fingerprint,
        severity,
        location: {
          path: resolvedPath,
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
