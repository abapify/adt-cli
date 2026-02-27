/**
 * Finding Resolver for abapGit repositories
 *
 * Resolves ATC finding locations (object type/name + method-relative line)
 * to actual git file paths and file-relative line numbers, respecting
 * the repository's folder logic (PREFIX vs FULL).
 *
 * This is the bridge between ATC (which knows SAP objects) and git
 * (which knows files). The abapgit plugin owns this mapping because
 * it defines how SAP objects map to files on disk.
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { basename } from 'path';
import type { FindingResolver, ResolvedLocation } from '@abapify/adt-atc';

// ── Method range parsing ────────────────────────────────────────────────

interface MethodRange {
  name: string;
  startLine: number;
  length: number;
}

const fileCache = new Map<string, string[]>();

function getFileLines(filePath: string): string[] | null {
  if (fileCache.has(filePath)) return fileCache.get(filePath)!;
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    fileCache.set(filePath, lines);
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
    const match = lines[i].match(/^\s*METHOD\s+(\w+)/i);
    if (match) {
      currentMethod = match[1].toLowerCase();
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

/**
 * Convert method-relative ATC line to file-relative line
 */
function convertLine(
  atcLine: number,
  methodName: string | undefined,
  filePath: string,
): number {
  if (!filePath.endsWith('.clas.abap')) return atcLine;

  const lines = getFileLines(filePath);
  if (!lines) return atcLine;

  const ranges = parseMethodRanges(lines);
  if (ranges.length === 0) return atcLine;

  // Best case: method name known
  if (methodName) {
    const method = ranges.find((r) => r.name === methodName.toLowerCase());
    if (method) return method.startLine + atcLine - 1;
  }

  // Single method
  if (ranges.length === 1) return ranges[0].startLine + atcLine - 1;

  // Heuristic: smallest method where atcLine fits
  const candidates = ranges
    .filter((r) => atcLine <= r.length)
    .sort((a, b) => a.length - b.length);
  if (candidates.length > 0) return candidates[0].startLine + atcLine - 1;

  return atcLine;
}

// ── Resolver factory ────────────────────────────────────────────────────

/**
 * Create a FindingResolver for an abapGit repository.
 *
 * Scans the `src/` directory to build a filename → git-path lookup,
 * then uses it to resolve ATC object references to actual file paths.
 * Also converts method-relative line numbers to file-relative by
 * parsing METHOD/ENDMETHOD statements in ABAP class files.
 *
 * @param srcRoot - Path to scan for source files (default: 'src/')
 * @returns FindingResolver implementation
 *
 * @example
 * ```typescript
 * const resolver = createFindingResolver();
 * const loc = await resolver.resolve('CLAS', 'ZCL_MY_CLASS', 21, 'my_method');
 * // { path: 'src/zpackage/zpackage_clas/zcl_my_class.clas.abap', line: 38 }
 * ```
 */
export function createFindingResolver(srcRoot = 'src/'): FindingResolver {
  // Build filename → git-path lookup by scanning src/ tree
  const lookup = new Map<string, string>();

  try {
    if (existsSync(srcRoot)) {
      const files = execSync(
        `find ${srcRoot} -type f \\( -name "*.abap" -o -name "*.xml" \\)`,
        { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 },
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
    }
  } catch {
    // src/ scan failed — resolver will fall back to null
  }

  if (lookup.size > 0) {
    console.log(
      `📂 Finding resolver: ${lookup.size} files indexed from ${srcRoot}`,
    );
  }

  return {
    async resolve(
      objectType: string,
      objectName: string,
      atcLine: number,
      methodName?: string,
    ): Promise<ResolvedLocation | null> {
      // Construct expected filename from object type + name
      const expectedFilename = `${objectName.toLowerCase()}.${objectType.toLowerCase()}.abap`;
      const resolvedPath = lookup.get(expectedFilename);

      if (!resolvedPath) return null;

      // Convert method-relative line to file-relative
      const fileLine = convertLine(atcLine, methodName, resolvedPath);

      return { path: resolvedPath, line: fileLine };
    },
  };
}
