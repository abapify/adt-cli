/**
 * Built-in abapGit Finding Resolver.
 *
 * ATC identifies a finding by an ADT URI, while GitLab needs the path of the
 * serialized abapGit file. The resolver owns that format-specific mapping and
 * scans the checked-out repository so PREFIX and FULL layouts both resolve to
 * the path that actually exists in Git.
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  type Dirent,
} from 'node:fs';
import {
  basename,
  join,
  relative,
  resolve as resolvePath,
  sep,
} from 'node:path';
import type { FindingResolver, ResolvedLocation } from '../types';
import { adtUriToAbapGitPath } from './adt-uri-to-abapgit-path';

type FolderLogic = 'prefix' | 'full' | 'full-with-root';

interface AbapGitMetadata {
  folderLogic?: FolderLogic;
  startingFolder: string;
}

interface ResolverRepository {
  root: string;
  sourceRoot: string;
  metadata?: AbapGitMetadata;
  configuredFormat?: string;
  configuredFolderLogic?: FolderLogic;
}

function toPosix(pathValue: string): string {
  return sep === '/' ? pathValue : pathValue.split(sep).join('/');
}

function normalizeStartingFolder(value: string | undefined): string {
  const normalized = (value || 'src')
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\/+|\/+$/g, '');
  return normalized || 'src';
}

function parseFolderLogic(value: string | undefined): FolderLogic | undefined {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'prefix' ||
    normalized === 'full' ||
    normalized === 'full-with-root'
  ) {
    return normalized;
  }
  return undefined;
}

function parseAbapGitMetadata(root: string): AbapGitMetadata | undefined {
  const metadataPath = join(root, '.abapgit.xml');
  if (!existsSync(metadataPath)) return undefined;

  try {
    const xml = readFileSync(metadataPath, 'utf8');
    return {
      folderLogic: parseFolderLogic(
        xml.match(/<FOLDER_LOGIC>\s*([^<]+?)\s*<\/FOLDER_LOGIC>/i)?.[1],
      ),
      startingFolder: normalizeStartingFolder(
        xml.match(/<STARTING_FOLDER>\s*([^<]+?)\s*<\/STARTING_FOLDER>/i)?.[1],
      ),
    };
  } catch {
    return undefined;
  }
}

function parseConfiguredFormat(root: string): {
  format?: string;
  folderLogic?: FolderLogic;
} {
  const configPaths = [
    process.env.ADT_CONFIG_PATH,
    join(root, 'adt.config.ts'),
    join(root, 'adt.config.js'),
    join(root, 'adt.config.mjs'),
  ].filter((value): value is string => Boolean(value));

  for (const configPath of [
    ...new Set(configPaths.map((value) => resolvePath(value))),
  ]) {
    if (!existsSync(configPath)) continue;
    try {
      const config = readFileSync(configPath, 'utf8');
      const formatId = config.match(
        /\bformat\s*:\s*\{[\s\S]*?\bid\s*:\s*['"]([^'"]+)['"]/i,
      )?.[1];
      const folderLogic = parseFolderLogic(
        config.match(/\bfolderLogic\s*:\s*['"]([^'"]+)['"]/i)?.[1],
      );
      if (formatId || folderLogic) {
        return {
          ...(formatId ? { format: formatId.trim().toLowerCase() } : {}),
          ...(folderLogic ? { folderLogic } : {}),
        };
      }
    } catch {
      // An unreadable optional config must not disable report generation.
    }
  }
  return {};
}

function findRepositoryRoot(): string {
  const configuredRoot =
    process.env.CI_PROJECT_DIR?.trim() || process.env.SOURCE_REPO_DIR?.trim();
  if (configuredRoot) return resolvePath(configuredRoot);

  // Preserve the old API behaviour for callers that pass an explicit source
  // path: paths are still reported relative to the current working directory.
  return process.cwd();
}

function resolveRepository(srcRoot: string): ResolverRepository {
  const usesConfiguredSourceRoot = srcRoot === 'src/' || srcRoot === 'src';
  const root = usesConfiguredSourceRoot ? findRepositoryRoot() : process.cwd();
  const metadata = parseAbapGitMetadata(root);
  const configured = parseConfiguredFormat(root);
  const configuredSourceFolder = metadata?.startingFolder ?? 'src';
  const sourcePath = usesConfiguredSourceRoot
    ? join(root, configuredSourceFolder)
    : resolvePath(process.cwd(), srcRoot);

  // Guard against path traversal via STARTING_FOLDER — the resolved source
  // root must stay inside the repository root. Use realpath to resolve
  // symlinks before the containment check. If it escapes, fall back to
  // the default `src` folder. Guard existsSync before realpathSync so a
  // missing source folder does not throw and abort report generation.
  const realRoot = existsSync(root) ? realpathSync(root) : root;
  const realSourcePath = existsSync(sourcePath)
    ? realpathSync(sourcePath)
    : sourcePath;
  const safeSourcePath =
    realSourcePath === realRoot || realSourcePath.startsWith(realRoot + sep)
      ? sourcePath
      : join(root, 'src');

  return {
    root,
    sourceRoot: safeSourcePath,
    metadata,
    configuredFormat: configured.format,
    configuredFolderLogic: configured.folderLogic,
  };
}

// ── Source tree and file contents ───────────────────────────────────────

const fileCache = new Map<string, string[]>();

const SOURCE_EXTENSIONS = ['.abap', '.xml', '.acds', '.abdl'];

function hasSourceExtension(filename: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

function indexEntry(
  entry: Dirent,
  current: string,
  result: string[],
  stack: string[],
): void {
  const fullPath = join(current, entry.name);
  if (entry.isDirectory()) {
    stack.push(fullPath);
  } else if (entry.isFile() && hasSourceExtension(entry.name)) {
    result.push(fullPath);
  }
}

function collectSourceFiles(root: string): string[] {
  const result: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      indexEntry(entry, current, result, stack);
    }
  }

  return result;
}

function getFileLines(filePath: string): string[] | null {
  const cached = fileCache.get(filePath);
  if (cached) return cached;
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n');
    fileCache.set(filePath, lines);
    return lines;
  } catch {
    return null;
  }
}

// ── Method range parsing ────────────────────────────────────────────────

interface MethodRange {
  name: string;
  startLine: number;
  length: number;
}

function parseMethodRanges(lines: string[]): MethodRange[] {
  const ranges: MethodRange[] = [];
  let currentMethod: string | null = null;
  let methodStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*METHOD\s+(\w+)/i);
    if (match) {
      currentMethod = match[1].toLowerCase();
      methodStart = i + 1;
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

  if (methodName) {
    const method = ranges.find(
      (range) => range.name === methodName.toLowerCase(),
    );
    if (method) return method.startLine + atcLine - 1;
  }

  // Without a method name the ATC line is already relative to the class
  // file, so return it as-is instead of guessing a method.
  return atcLine;
}

// ── Resolver factory ────────────────────────────────────────────────────

/**
 * Create a built-in abapGit finding resolver.
 *
 * The full ATC location is used to derive the canonical abapGit basename.
 * The actual checked-out path is then selected from the configured source
 * tree, which naturally preserves PREFIX/FULL package directories and the
 * repository's STARTING_FOLDER.
 */
export function createAbapGitResolver(srcRoot = 'src/'): FindingResolver {
  const repository = resolveRepository(srcRoot);
  const lookup = new Map<string, string>();

  try {
    if (existsSync(repository.sourceRoot)) {
      const files = collectSourceFiles(repository.sourceRoot).sort(
        (left, right) => left.localeCompare(right),
      );

      const ambiguous = new Set<string>();
      for (const filePath of files) {
        const name = basename(filePath).toLowerCase();
        if (lookup.has(name)) {
          ambiguous.add(name);
        } else {
          lookup.set(name, filePath);
        }
      }
      for (const name of ambiguous) lookup.delete(name);
    }
  } catch {
    // Source scan failed — resolver will return null for all findings.
  }

  if (lookup.size > 0) {
    const metadata = repository.metadata;
    const format = repository.configuredFormat ?? 'abapgit';
    const folderLogic =
      metadata?.folderLogic ?? repository.configuredFolderLogic ?? 'prefix';
    const startingFolder = metadata?.startingFolder ?? 'src';
    console.log(
      `📂 Finding resolver: ${lookup.size} files indexed (format=${format}, folderLogic=${folderLogic}, startingFolder=${startingFolder})`,
    );
  }

  return {
    async resolve(
      objectType: string,
      objectName: string,
      atcLine: number,
      methodName?: string,
      atcLocation?: string,
    ): Promise<ResolvedLocation | null> {
      const canonicalPath = atcLocation
        ? adtUriToAbapGitPath(atcLocation)
        : null;
      const candidatePath =
        canonicalPath ??
        `${objectName.toLowerCase()}.${objectType.toLowerCase()}.abap`;
      const candidateSegments = candidatePath.split('/');
      const expectedFilename = candidateSegments[candidateSegments.length - 1];
      if (!expectedFilename) return null;
      const resolvedPath = lookup.get(expectedFilename.toLowerCase());

      if (!resolvedPath) return null;

      const fileLine = convertLine(atcLine, methodName, resolvedPath);
      const gitPath = toPosix(relative(repository.root, resolvedPath));
      if (!gitPath || gitPath.startsWith('../')) return null;

      return { path: gitPath, line: fileLine };
    },
  };
}
