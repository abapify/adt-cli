/**
 * Built-in abapGit Finding Resolver
 *
 * Resolves ATC finding locations to actual git file paths and file-relative
 * line numbers for abapGit repositories (FULL or PREFIX folder logic).
 *
 * This is a built-in resolver that uses only Node.js builtins (fs, path).
 * No external package dependencies required.
 */

import { readFileSync, existsSync, readdirSync, type Dirent } from 'fs';
import { basename, join } from 'path';
import type { FindingResolver, ResolvedLocation } from '../types';

// ── Method range parsing ────────────────────────────────────────────────

interface MethodRange {
  name: string;
  startLine: number;
  length: number;
}

const fileCache = new Map<string, string[]>();

function collectSourceFiles(root: string): string[] {
  const result: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (
        entry.isFile() &&
        (fullPath.endsWith('.abap') || fullPath.endsWith('.xml'))
      ) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

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

// ── Resolver factory ────────────────────────────────────────────────────

/**
 * Create a built-in abapGit finding resolver.
 *
 * Scans src/ to build a filename → git-path lookup, then resolves
 * ATC object references to actual file paths and converts method-relative
 * line numbers to file-relative.
 *
 * @param srcRoot - Path to scan for source files (default: 'src/')
 */
export function createAbapGitResolver(srcRoot = 'src/'): FindingResolver {
  const lookup = new Map<string, string>();

  try {
    if (existsSync(srcRoot)) {
      const files = collectSourceFiles(srcRoot);

      for (const f of files) {
        const name = basename(f);
        if (!lookup.has(name)) {
          lookup.set(name, f);
        }
      }
    }
  } catch {
    // src/ scan failed — resolver will return null for all findings
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
      const expectedFilename = `${objectName.toLowerCase()}.${objectType.toLowerCase()}.abap`;
      const resolvedPath = lookup.get(expectedFilename);

      if (!resolvedPath) return null;

      const fileLine = convertLine(atcLine, methodName, resolvedPath);
      return { path: resolvedPath, line: fileLine };
    },
  };
}
