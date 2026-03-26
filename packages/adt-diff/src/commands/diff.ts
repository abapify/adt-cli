/**
 * Diff Command Plugin — Type-Agnostic
 *
 * Compares local abapGit files against what SAP has.
 *
 * The local file (from abapGit) is the source of truth — it defines which
 * fields matter. The remote side is fetched from SAP via ADT, serialized
 * through the same handler, then **projected** onto the local's field set.
 * Any extra fields the serializer adds (LANGDEP, POSITION, etc.) are
 * stripped so the diff only shows real value changes.
 *
 * For XML metadata: parse both → project remote onto local's keys → rebuild
 * For .abap source: compare text directly
 *
 * Works for ALL object types supported by adt-plugin-abapgit:
 *   CLAS, INTF, PROG, FUGR, TABL, DOMA, DTEL, TTYP, DEVC
 *
 * Usage:
 *   adt diff zage_structure.tabl.xml
 *   adt diff *.tabl.xml
 *   adt diff zcl_myclass.clas.xml --no-color
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';
import { createAdk, type AdtClient, type AdkFactory } from '@abapify/adk';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { glob as nativeGlob } from 'node:fs/promises';
import { resolve, basename, dirname, join } from 'node:path';
import { createTwoFilesPatch } from 'diff';
import chalk from 'chalk';
import {
  getHandler,
  getSupportedTypes,
  parseAbapGitFilename,
  type ObjectHandler,
} from '@abapify/adt-plugin-abapgit';
import { tablXmlToCdsDdl } from '../lib/abapgit-to-cds';
import { adtContract } from '@abapify/adt-contracts';

/**
 * ADT schema lookup for --raw mode.
 *
 * Maps abapGit type codes to raw CRUD contract schemas (NOT speci-proxied).
 * Each entry has:
 * - schema: the TypedSchema with .build() for XML serialization
 * - wrapperKey: the root element key expected by build()
 */
const adtSchemaMap: Record<
  string,
  { schema: { build: (data: unknown, options?: { pretty?: boolean }) => string }; wrapperKey: string }
> = {
  TTYP: {
    schema: adtContract.ddic.tabletypes.bodySchema,
    wrapperKey: 'tableType',
  },
  DOMA: { schema: adtContract.ddic.domains.bodySchema, wrapperKey: 'domain' },
  DTEL: {
    schema: adtContract.ddic.dataelements.bodySchema,
    wrapperKey: 'wbobj',
  },
  CLAS: { schema: adtContract.oo.classes.bodySchema, wrapperKey: 'abapClass' },
  INTF: {
    schema: adtContract.oo.interfaces.bodySchema,
    wrapperKey: 'abapInterface',
  },
  PROG: {
    schema: adtContract.programs.programs.bodySchema,
    wrapperKey: 'abapProgram',
  },
  FUGR: {
    schema: adtContract.functions.groups.bodySchema,
    wrapperKey: 'abapFunctionGroup',
  },
  DEVC: {
    schema: adtContract.packages.bodySchema,
    wrapperKey: 'package',
  },
};

/**
 * Expand glob patterns to matching file paths.
 * Passes through literal filenames unchanged.
 */
async function expandGlobs(patterns: string[], cwd: string): Promise<string[]> {
  const results: string[] = [];
  for (const pattern of patterns) {
    if (/[*?[\]{}]/.test(pattern)) {
      for await (const match of nativeGlob(pattern, { cwd })) {
        results.push(match);
      }
    } else {
      results.push(pattern);
    }
  }
  return results;
}

/**
 * Collect all local files belonging to one abapGit object.
 *
 * Given the XML metadata file, scans the same directory for companion
 * .abap files that share the same name.type prefix.
 *
 * @returns Map of relative filename → content
 */
function collectLocalFiles(
  xmlPath: string,
  objectName: string,
  fileExtension: string,
): Map<string, string> {
  const dir = dirname(xmlPath);
  const prefix = `${objectName}.${fileExtension}`;
  const files = new Map<string, string>();

  for (const entry of readdirSync(dir)) {
    if (entry.toLowerCase().startsWith(prefix)) {
      const fullPath = join(dir, entry);
      files.set(entry.toLowerCase(), readFileSync(fullPath, 'utf-8'));
    }
  }

  return files;
}

/**
 * Project `source` onto `reference`'s key structure.
 *
 * Recursively keeps only the keys from `source` that also exist in
 * `reference`. For arrays, builds a **union** of all keys across all
 * reference elements as the template — because different elements may
 * have different optional fields (e.g. DD03P entries where some have
 * DECIMALS and others don't).
 *
 * This ensures the remote object only contains fields the local cares
 * about, so serializer-added extras (LANGDEP, POSITION, etc.) vanish.
 */
function projectOnto(source: unknown, reference: unknown): unknown {
  if (reference === null || reference === undefined) return source;
  if (source === null || source === undefined) return source;

  // Both arrays — build union template from ALL reference elements
  if (Array.isArray(reference) && Array.isArray(source)) {
    if (reference.length === 0) return source;

    // Merge all reference elements into a union shape
    const unionShape = mergeObjectKeys(reference);
    if (unionShape === undefined) return source;

    return source.map((item) => projectOnto(item, unionShape));
  }

  // Both objects — keep only keys present in reference
  if (
    typeof reference === 'object' &&
    typeof source === 'object' &&
    !Array.isArray(reference) &&
    !Array.isArray(source)
  ) {
    const ref = reference as Record<string, unknown>;
    const src = source as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(ref)) {
      if (key in src) {
        result[key] = projectOnto(src[key], ref[key]);
      }
    }
    return result;
  }

  // Primitives — return source as-is
  return source;
}

/**
 * Merge all keys from an array of objects into a single union object.
 * Each key gets the first non-undefined value found across elements.
 * Used to build the "widest" template for array element projection.
 */
function mergeObjectKeys(
  items: unknown[],
): Record<string, unknown> | undefined {
  const objects = items.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && !Array.isArray(item),
  );
  if (objects.length === 0) return undefined;

  const union: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in union) || union[key] === undefined) {
        union[key] = value;
      }
    }
  }
  return union;
}

/**
 * Normalize an XML pair for comparison.
 *
 * 1. Parse both local and remote through the schema (strips formatting)
 * 2. Project remote values onto local's field structure (strips extras)
 * 3. Rebuild both through the same builder (identical formatting)
 *
 * Returns [normalizedLocal, normalizedRemote].
 */
function normalizeXmlPair(
  localXml: string,
  remoteXml: string,
  handler: ObjectHandler,
): [string, string] {
  try {
    const localParsed = handler.schema.parse(localXml);
    const remoteParsed = handler.schema.parse(remoteXml);

    // Project remote onto local's shape — drop fields local doesn't have
    const remoteProjected = projectOnto(remoteParsed, localParsed);

    const normalizedLocal = handler.schema.build(localParsed, { pretty: true });
    const normalizedRemote = handler.schema.build(
      remoteProjected as typeof localParsed,
      { pretty: true },
    );

    return [normalizedLocal, normalizedRemote];
  } catch {
    // If parsing fails, return as-is
    return [localXml, remoteXml];
  }
}

/**
 * Print a unified diff with optional color.
 * Returns true if differences were found.
 */
function printDiff(
  localLabel: string,
  remoteLabel: string,
  localContent: string,
  remoteContent: string,
  contextLines: number,
  useColor: boolean,
): boolean {
  const local = localContent.endsWith('\n')
    ? localContent
    : localContent + '\n';
  const remote = remoteContent.endsWith('\n')
    ? remoteContent
    : remoteContent + '\n';

  if (local === remote) return false;

  const patch = createTwoFilesPatch(
    `a/${localLabel}`,
    `b/${remoteLabel}`,
    local,
    remote,
    'local',
    'remote (SAP)',
    { context: contextLines },
  );

  for (const line of patch.split('\n')) {
    if (!useColor) {
      console.log(line);
      continue;
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      console.log(chalk.bold(line));
    } else if (line.startsWith('+')) {
      console.log(chalk.green(line));
    } else if (line.startsWith('-')) {
      console.log(chalk.red(line));
    } else if (line.startsWith('@@')) {
      console.log(chalk.cyan(line));
    } else {
      console.log(line);
    }
  }

  return true;
}

/** Result of diffing a single file */
interface DiffResult {
  objectName: string;
  objectType: string;
  hasDifferences: boolean;
  fileCount: number;
  identicalCount: number;
  error?: string;
}

/**
 * Diff a single abapGit XML file against SAP remote.
 * Returns a result object indicating whether differences were found.
 */
async function diffSingleFile(
  filePath: string,
  ctx: CliContext,
  adk: AdkFactory,
  options: {
    contextLines: number;
    useColor: boolean;
    source: boolean;
    raw: boolean;
  },
): Promise<DiffResult> {
  const { contextLines, useColor, source, raw } = options;
  const fullPath = resolve(ctx.cwd, filePath);

  if (!existsSync(fullPath)) {
    return {
      objectName: filePath,
      objectType: '?',
      hasDifferences: false,
      fileCount: 0,
      identicalCount: 0,
      error: `File not found: ${fullPath}`,
    };
  }

  // Parse filename to detect type
  const filename = basename(fullPath);
  const parsed = parseAbapGitFilename(filename);
  if (!parsed) {
    return {
      objectName: filename,
      objectType: '?',
      hasDifferences: false,
      fileCount: 0,
      identicalCount: 0,
      error: `Cannot parse filename: ${filename}. Expected abapGit format: name.type.xml`,
    };
  }

  if (parsed.extension !== 'xml') {
    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: false,
      fileCount: 0,
      identicalCount: 0,
      error: `Expected .xml metadata file, got .${parsed.extension}. Pass the .xml file, not .abap.`,
    };
  }

  // Validate --source option
  if (source && parsed.type !== 'TABL') {
    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: false,
      fileCount: 0,
      identicalCount: 0,
      error: `Source format is only supported for TABL objects. Got: ${parsed.type}`,
    };
  }

  // Validate mutual exclusion of --source and --raw
  if (source && raw) {
    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: false,
      fileCount: 0,
      identicalCount: 0,
      error: '--source and --raw are mutually exclusive',
    };
  }

  // Look up handler from abapGit registry
  const handler = getHandler(parsed.type);
  if (!handler) {
    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: false,
      fileCount: 0,
      identicalCount: 0,
      error: `Unsupported object type: ${parsed.type}. Supported: ${getSupportedTypes().join(', ')}`,
    };
  }

  // Collect local files for this object
  const objectName = parsed.name.toLowerCase();
  const localFiles = collectLocalFiles(
    fullPath,
    objectName,
    handler.fileExtension,
  );

  console.log(
    `\n${useColor ? chalk.bold('Diff:') : 'Diff:'} ${parsed.name} (${parsed.type}) — ${localFiles.size} file(s)`,
  );

  // Parse local XML to extract ADK type info via fromAbapGit
  const localXml = readFileSync(fullPath, 'utf-8');
  let adkType = parsed.type;

  if (handler.fromAbapGit) {
    try {
      const parsedXml = handler.schema.parse(localXml);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values = (parsedXml as any)?.abapGit?.abap?.values ?? {};
      const payload = handler.fromAbapGit(values);
      if (typeof payload.type === 'string') {
        adkType = payload.type;
      }
    } catch {
      // Fall through — use filename-derived type
    }
  }

  // Fetch remote ADK object
  console.log(
    `${useColor ? chalk.dim('Fetching') : 'Fetching'} ${parsed.name} (${adkType}) from SAP...`,
  );

  const remoteObj = adk.get(parsed.name, adkType);

  try {
    await remoteObj.load();
  } catch (error) {
    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: false,
      fileCount: localFiles.size,
      identicalCount: 0,
      error: `Failed to load remote object: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // ========================================
  // Source format: compare ADK source (e.g. CDS DDL)
  // ========================================
  if (source) {
    const localSource = tablXmlToCdsDdl(localXml);

    let remoteSource: string;
    try {
      remoteSource = await remoteObj.getSource();
    } catch (error) {
      return {
        objectName: parsed.name,
        objectType: parsed.type,
        hasDifferences: false,
        fileCount: 1,
        identicalCount: 0,
        error: `Failed to fetch remote source: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Project remote onto local's annotation set — same principle as XML path.
    // If local XML doesn't have a field (e.g. MATEFLAG), strip the
    // corresponding annotation from remote so it doesn't appear as a diff.
    const localAnnotations = new Set(
      localSource
        .split('\n')
        .filter((l) => l.startsWith('@'))
        .map((l) => l.split(':')[0].trim()),
    );
    remoteSource = remoteSource
      .split('\n')
      .filter((l) => {
        if (!l.startsWith('@')) return true;
        const name = l.split(':')[0].trim();
        return localAnnotations.has(name);
      })
      .join('\n');

    const sourceFile = `${objectName}.tabl.acds`;
    const diffFound = printDiff(
      sourceFile,
      sourceFile,
      localSource,
      remoteSource,
      contextLines,
      useColor,
    );

    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: diffFound,
      fileCount: 1,
      identicalCount: diffFound ? 0 : 1,
    };
  }

  // ========================================
  // Raw mode: compare ADT-level XML payloads
  // ========================================
  if (raw) {
    const adtSchema = adtSchemaMap[parsed.type];
    if (!adtSchema) {
      return {
        objectName: parsed.name,
        objectType: parsed.type,
        hasDifferences: false,
        fileCount: 1,
        identicalCount: 0,
        error: `Raw mode not supported for ${parsed.type}: no ADT schema mapping. Supported: ${Object.keys(adtSchemaMap).join(', ')}`,
      };
    }

    const { schema: rawSchema, wrapperKey } = adtSchema;

    // Build remote ADT XML from loaded data
    let remoteAdtXml: string;
    try {
      const remoteData = await remoteObj.data();
      remoteAdtXml = rawSchema.build({ [wrapperKey]: remoteData }, { pretty: true });
    } catch (e) {
      return {
        objectName: parsed.name,
        objectType: parsed.type,
        hasDifferences: false,
        fileCount: 1,
        identicalCount: 0,
        error: `Failed to build remote ADT XML: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // Parse local abapGit XML → fromAbapGit() → local ADK data
    let localAdtXml: string | undefined;
    if (handler.fromAbapGit) {
      try {
        const parsedXml = handler.schema.parse(localXml);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const values = (parsedXml as any)?.abapGit?.abap?.values ?? {};
        const localPayload = handler.fromAbapGit(values);

        // Merge local overrides onto remote's full data (remote is template)
        const remoteData = await remoteObj.data();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merged = { ...(remoteData as any), ...localPayload };
        localAdtXml = rawSchema.build({ [wrapperKey]: merged }, { pretty: true });
      } catch (e) {
        return {
          objectName: parsed.name,
          objectType: parsed.type,
          hasDifferences: false,
          fileCount: 1,
          identicalCount: 0,
          error: `Failed to build local ADT XML: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    if (!localAdtXml) {
      return {
        objectName: parsed.name,
        objectType: parsed.type,
        hasDifferences: false,
        fileCount: 1,
        identicalCount: 0,
        error: `Raw mode not supported for ${parsed.type}: no fromAbapGit() mapping`,
      };
    }

    const xmlFile = `${objectName}.${parsed.type.toLowerCase()}.adt.xml`;
    const diffFound = printDiff(
      xmlFile,
      xmlFile,
      localAdtXml,
      remoteAdtXml,
      contextLines,
      useColor,
    );

    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: diffFound,
      fileCount: 1,
      identicalCount: diffFound ? 0 : 1,
    };
  }

  // Serialize remote using the same handler → produces SerializedFile[]
  let remoteFiles;
  try {
    remoteFiles = await handler.serialize(remoteObj);
  } catch (error) {
    return {
      objectName: parsed.name,
      objectType: parsed.type,
      hasDifferences: false,
      fileCount: localFiles.size,
      identicalCount: 0,
      error: `Failed to serialize remote object: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Build remote file map (lowercase path → content)
  const remoteMap = new Map<string, string>();
  for (const f of remoteFiles) {
    remoteMap.set(f.path.toLowerCase(), f.content);
  }

  // Diff each file
  let hasDifferences = false;
  let identicalCount = 0;

  for (const [localPath, localContent] of localFiles) {
    const remoteContent = remoteMap.get(localPath);
    if (remoteContent === undefined) {
      console.log(
        useColor
          ? chalk.yellow(`\n  + Only in local: ${localPath}`)
          : `\n  + Only in local: ${localPath}`,
      );
      hasDifferences = true;
      continue;
    }

    // For XML files: normalize both through schema, projecting remote
    // onto local's field set to strip serializer-added extras
    const isXml = localPath.endsWith('.xml');
    let diffLocal = localContent;
    let diffRemote = remoteContent;
    if (isXml) {
      [diffLocal, diffRemote] = normalizeXmlPair(
        localContent,
        remoteContent,
        handler,
      );
    }

    const diffFound = printDiff(
      localPath,
      localPath,
      diffLocal,
      diffRemote,
      contextLines,
      useColor,
    );
    if (diffFound) {
      hasDifferences = true;
    } else {
      identicalCount++;
    }
  }

  // Files present in remote but not locally
  for (const [remotePath] of remoteMap) {
    if (!localFiles.has(remotePath)) {
      console.log(
        useColor
          ? chalk.yellow(`\n  - Only in remote: ${remotePath}`)
          : `\n  - Only in remote: ${remotePath}`,
      );
      hasDifferences = true;
    }
  }

  return {
    objectName: parsed.name,
    objectType: parsed.type,
    hasDifferences,
    fileCount: localFiles.size,
    identicalCount,
  };
}

export const diffCommand: CliCommandPlugin = {
  name: 'diff',
  description:
    'Compare local abapGit files against SAP remote (any supported object type)',

  arguments: [
    {
      name: '[files...]',
      description: `Local .xml files or glob patterns to compare (e.g., zcl_myclass.clas.xml, *.tabl.xml). Supported types: ${getSupportedTypes().join(', ')}`,
    },
  ],

  options: [
    {
      flags: '--no-color',
      description: 'Disable colored output',
    },
    {
      flags: '-c, --context <lines>',
      description: 'Number of context lines in diff',
      default: '3',
    },
    {
      flags: '-s, --source',
      description:
        'Compare ADK source instead of XML (TABL only)',
    },
    {
      flags: '-r, --raw',
      description:
        'Compare ADT-level XML payloads (what GET returns vs what PUT would send)',
    },
  ],

  async execute(args: Record<string, unknown>, ctx: CliContext) {
    const filePatterns = (args.files as string[]) ?? [];
    const contextLines = parseInt(String(args.context ?? '3'), 10);
    const useColor = args.color !== false;
    const source = args.source === true;
    const raw = args.raw === true;

    if (filePatterns.length === 0) {
      ctx.logger.error(
        'No files specified. Usage: adt diff <file...> or adt diff *.tabl.xml',
      );
      process.exit(1);
    }

    // Expand glob patterns
    const files = await expandGlobs(filePatterns, ctx.cwd);
    if (files.length === 0) {
      ctx.logger.error('No files matched the given pattern(s).');
      process.exit(1);
    }

    // Need ADT client for remote comparison
    if (!ctx.getAdtClient) {
      ctx.logger.error('ADT client not available. Run: adt auth login');
      process.exit(1);
    }

    // Create ADT client and ADK once, shared across all files
    const client = await ctx.getAdtClient!();
    const adk = createAdk(client as AdtClient);

    // Diff each file
    const results: DiffResult[] = [];
    for (const file of files) {
      const result = await diffSingleFile(file, ctx, adk, {
        contextLines,
        useColor,
        source,
        raw,
      });

      if (result.error) {
        ctx.logger.error(result.error);
      }

      results.push(result);
    }

    // Summary
    const totalFiles = results.length;
    const withDiffs = results.filter((r) => r.hasDifferences).length;
    const withErrors = results.filter((r) => r.error).length;
    const identical = totalFiles - withDiffs - withErrors;

    console.log('');
    if (totalFiles === 1) {
      // Single-file mode: keep original concise output
      const r = results[0];
      if (r.error) {
        // Error already printed above
        process.exit(1);
      }
      if (r.hasDifferences) {
        console.log(
          useColor
            ? chalk.red('Differences found.') +
                (r.identicalCount > 0
                  ? chalk.dim(` (${r.identicalCount} file(s) identical)`)
                  : '')
            : `Differences found.${r.identicalCount > 0 ? ` (${r.identicalCount} file(s) identical)` : ''}`,
        );
        process.exit(1);
      }
      console.log(
        useColor
          ? chalk.green(
              `No differences found. (${r.identicalCount} file(s) identical)`,
            )
          : `No differences found. (${r.identicalCount} file(s) identical)`,
      );
      return;
    }

    // Multi-file summary
    const parts: string[] = [
      `${totalFiles} object(s) checked`,
      `${identical} identical`,
    ];
    if (withDiffs > 0) parts.push(`${withDiffs} with differences`);
    if (withErrors > 0) parts.push(`${withErrors} with errors`);
    const summary = parts.join(', ');

    if (withDiffs > 0 || withErrors > 0) {
      console.log(
        useColor
          ? chalk.red(`Diff summary: ${summary}`)
          : `Diff summary: ${summary}`,
      );
      process.exit(1);
    }
    console.log(
      useColor
        ? chalk.green(`Diff summary: ${summary}`)
        : `Diff summary: ${summary}`,
    );
  },
};

export default diffCommand;
