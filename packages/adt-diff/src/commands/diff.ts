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
 *   adt diff zcl_myclass.clas.xml
 *   adt diff zif_myintf.intf.xml --no-color
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';
import { createAdk, type AdtClient } from '@abapify/adk';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

export const diffCommand: CliCommandPlugin = {
  name: 'diff',
  description:
    'Compare local abapGit files against SAP remote (any supported object type)',

  arguments: [
    {
      name: '<file>',
      description: `Local .xml file to compare (e.g., zcl_myclass.clas.xml). Supported types: ${getSupportedTypes().join(', ')}`,
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
      flags: '-f, --format <format>',
      description:
        'Comparison format: xml (default) or ddl (TABL only — compare CDS DDL source)',
      default: 'xml',
    },
  ],

  async execute(args: Record<string, unknown>, ctx: CliContext) {
    const filePath = args.file as string;
    const contextLines = parseInt(String(args.context ?? '3'), 10);
    const useColor = args.color !== false;
    const format = String(args.format ?? 'xml').toLowerCase();

    // Resolve file path
    const fullPath = resolve(ctx.cwd, filePath);
    if (!existsSync(fullPath)) {
      ctx.logger.error(`File not found: ${fullPath}`);
      process.exit(1);
    }

    // Parse filename to detect type
    const filename = basename(fullPath);
    const parsed = parseAbapGitFilename(filename);
    if (!parsed) {
      ctx.logger.error(
        `Cannot parse filename: ${filename}. Expected abapGit format: name.type.xml`,
      );
      process.exit(1);
    }

    if (parsed.extension !== 'xml') {
      ctx.logger.error(
        `Expected .xml metadata file, got .${parsed.extension}. Pass the .xml file, not .abap.`,
      );
      process.exit(1);
    }

    // Validate --format option
    if (format !== 'xml' && format !== 'ddl') {
      ctx.logger.error(`Unknown format: ${format}. Supported: xml, ddl`);
      process.exit(1);
    }

    if (format === 'ddl' && parsed.type !== 'TABL') {
      ctx.logger.error(
        `DDL format is only supported for TABL objects. Got: ${parsed.type}`,
      );
      process.exit(1);
    }

    // Look up handler from abapGit registry
    const handler = getHandler(parsed.type);
    if (!handler) {
      ctx.logger.error(
        `Unsupported object type: ${parsed.type}. Supported: ${getSupportedTypes().join(', ')}`,
      );
      process.exit(1);
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

    // Need ADT client for remote comparison
    if (!ctx.getAdtClient) {
      ctx.logger.error('ADT client not available. Run: adt auth login');
      process.exit(1);
    }

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

    const client = await ctx.getAdtClient!();
    const adk = createAdk(client as AdtClient);
    const remoteObj = adk.get(parsed.name, adkType);

    try {
      await remoteObj.load();
    } catch (error) {
      ctx.logger.error(
        `Failed to load remote object: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }

    // ========================================
    // DDL format: compare CDS DDL source
    // ========================================
    if (format === 'ddl') {
      // Local: convert abapGit XML → CDS DDL
      const localXml = readFileSync(fullPath, 'utf-8');
      const localDdl = tablXmlToCdsDdl(localXml);

      // Remote: fetch CDS source directly from SAP
      let remoteDdl: string;
      try {
        remoteDdl = await remoteObj.getSource();
      } catch (error) {
        ctx.logger.error(
          `Failed to fetch remote DDL source: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }

      const ddlFile = `${objectName}.tabl.ddl`;
      const diffFound = printDiff(
        ddlFile,
        ddlFile,
        localDdl,
        remoteDdl,
        contextLines,
        useColor,
      );

      console.log('');
      if (diffFound) {
        console.log(
          useColor ? chalk.red('Differences found.') : 'Differences found.',
        );
        process.exit(1);
      } else {
        console.log(
          useColor
            ? chalk.green('No differences found. (DDL source identical)')
            : 'No differences found. (DDL source identical)',
        );
      }
      return;
    }

    // Serialize remote using the same handler → produces SerializedFile[]
    let remoteFiles;
    try {
      remoteFiles = await handler.serialize(remoteObj);
    } catch (error) {
      ctx.logger.error(
        `Failed to serialize remote object: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
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

    // Summary
    console.log('');
    if (!hasDifferences) {
      console.log(
        useColor
          ? chalk.green(
              `No differences found. (${identicalCount} file(s) identical)`,
            )
          : `No differences found. (${identicalCount} file(s) identical)`,
      );
      return;
    }

    console.log(
      useColor
        ? chalk.red('Differences found.') +
            (identicalCount > 0
              ? chalk.dim(` (${identicalCount} file(s) identical)`)
              : '')
        : `Differences found.${identicalCount > 0 ? ` (${identicalCount} file(s) identical)` : ''}`,
    );

    // Exit with non-zero if differences exist (standard diff convention)
    process.exit(1);
  },
};

export default diffCommand;
