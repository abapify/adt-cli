/**
 * Roundtrip Command Plugin
 *
 * Deploys local files to SAP, imports them back, and compares
 * the original with the re-serialized result.
 *
 * Usage:
 *   adt roundtrip zage_fixed_values.doma.xml -p ZABAPGIT_EXAMPLES
 *   adt roundtrip *.doma.xml -p ZABAPGIT_EXAMPLES   (glob pattern)
 *   adt roundtrip -s ./my-repo -p ZPACKAGE   (all files)
 */

import type {
  CliCommandPlugin,
  CliContext,
  ExportOptions,
  ImportContext,
} from '@abapify/adt-plugin';
import {
  AdkObjectSet,
  AdkPackage,
  type AdkContext,
  type AdkObject,
  type AdtClient,
  createAdk,
} from '@abapify/adk';
import {
  createFileTree,
  FilteredFileTree,
  findAbapGitRoot,
  resolveFilesRelativeToRoot,
} from '../utils/filetree';
import { loadFormatPlugin } from '../utils/format-plugin';
import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { glob as nativeGlob } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createTwoFilesPatch } from 'diff';
import chalk from 'chalk';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

/**
 * Resolve full package path from SAP (walks super packages upward)
 * Uses global ADK context (set when client is initialized)
 */
async function resolvePackagePath(packageName: string): Promise<string[]> {
  const path: string[] = [];
  let current = packageName;
  while (current) {
    path.unshift(current);
    try {
      const pkg = await AdkPackage.get(current);
      const superPkg = pkg.superPackage;
      if (superPkg?.name) {
        current = superPkg.name;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return path;
}

/**
 * Normalize XML for comparison
 * - Preserve namespace prefixes and declarations
 * - Normalize whitespace and indentation
 * - Format attributes on separate lines
 */
async function normalizeXml(xml: string): Promise<string> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      parseTagValue: false,
      parseAttributeValue: false,
      removeNSPrefix: false, // Keep namespace prefixes
    });

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: false,
    });

    // Parse → normalize → rebuild
    const obj = parser.parse(xml);
    let normalized = builder.build(obj);

    // Format attributes on separate lines for better diff readability
    const { formatXmlAttributes } = await import('@abapify/adt-plugin-abapgit');
    normalized = formatXmlAttributes(normalized);

    return normalized;
  } catch (_err) {
    // If parsing fails, return trimmed original
    return xml.trim();
  }
}

/**
 * Recursively collect all files in a directory (relative paths)
 */
function collectFiles(dir: string, base?: string): string[] {
  const result: string[] = [];
  const baseDir = base ?? dir;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(baseDir, full);
    if (statSync(full).isDirectory()) {
      result.push(...collectFiles(full, baseDir));
    } else {
      result.push(rel);
    }
  }
  return result;
}

/**
 * Expand glob patterns in a list of file arguments.
 * Literal filenames (no glob characters) pass through unchanged.
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

export const roundtripCommand: CliCommandPlugin = {
  name: 'roundtrip',
  description: 'Deploy files to SAP, import back, and compare (roundtrip test)',

  arguments: [
    {
      name: '[files...]',
      description:
        'Specific files or glob patterns to test (e.g., zage_fixed_values.doma.xml, *.doma.xml). Omit to test all.',
    },
  ],

  options: [
    {
      flags: '-s, --source <path>',
      description: 'Source directory containing serialized files',
      default: '.',
    },
    {
      flags: '-f, --format <format>',
      description: 'Format plugin: abapgit | @abapify/adt-plugin-abapgit',
      default: 'abapgit',
    },
    {
      flags: '-p, --package <package>',
      description: 'Target package for new objects',
    },
    {
      flags: '-t, --transport <request>',
      description: 'Transport request for changes',
    },
    {
      flags: '--types <types>',
      description: 'Filter by object types (comma-separated)',
    },
    {
      flags: '--activate',
      description: 'Activate objects after deploy (use --no-activate to skip)',
      default: true,
    },
    {
      flags: '--keep-tmp',
      description: 'Keep temporary reimport directory for inspection',
      default: false,
    },
    {
      flags: '--abap-language-version <version>',
      description: 'ABAP language version for new objects (2=keyUser, 5=cloud)',
    },
  ],

  async execute(args: Record<string, unknown>, ctx: CliContext) {
    const options = args as {
      files?: string[];
      source: string;
      format: string;
      transport?: string;
      package?: string;
      types?: string;
      activate?: boolean;
      keepTmp?: boolean;
      abapLanguageVersion?: string;
    };

    if (!ctx.getAdtClient) {
      ctx.logger.error('❌ ADT client not available. Run: adt auth login');
      process.exit(1);
    }

    // ── Resolve source path ──
    const expandedFiles =
      options.files && options.files.length > 0
        ? await expandGlobs(options.files, ctx.cwd)
        : undefined;
    const specificFiles =
      expandedFiles && expandedFiles.length > 0 ? expandedFiles : undefined;
    let sourcePath = options.source;

    if (specificFiles) {
      const repoRoot = findAbapGitRoot(ctx.cwd);
      if (!repoRoot) {
        ctx.logger.error('❌ No .abapgit.xml found in any parent directory.');
        process.exit(1);
      }
      sourcePath = repoRoot;
    }

    ctx.logger.info('🔄 Roundtrip test');
    ctx.logger.info(`📁 Source: ${sourcePath}`);
    if (specificFiles) ctx.logger.info(`📄 Files: ${specificFiles.join(', ')}`);
    if (options.package) ctx.logger.info(`📦 Package: ${options.package}`);

    // ── Build FileTree ──
    let fileTree = createFileTree(sourcePath);
    if (specificFiles) {
      const relFiles = resolveFilesRelativeToRoot(
        specificFiles,
        ctx.cwd,
        sourcePath,
      );
      fileTree = new FilteredFileTree(fileTree, relFiles);
    }

    const client = await ctx.getAdtClient!();
    const adkContext: AdkContext = { client: client as any };

    // ── Phase 1: Deploy ──
    ctx.logger.info('\n═══ Phase 1: Deploy to SAP ═══');

    const plugin = await loadFormatPlugin(options.format);
    if (!plugin.format.export) {
      ctx.logger.error(`❌ Plugin '${plugin.name}' does not support export`);
      process.exit(1);
    }

    const exportOptions: ExportOptions = {
      rootPackage: options.package,
      abapLanguageVersion: options.abapLanguageVersion,
    };

    // Parse object types filter
    const objectTypes = options.types
      ? options.types.split(',').map((t: string) => t.trim().toUpperCase())
      : undefined;

    const deployedObjects: AdkObject[] = [];
    const objectSet = await AdkObjectSet.fromGenerator(
      plugin.format.export(fileTree, client, exportOptions),
      adkContext,
      {
        filter: objectTypes
          ? (obj) => {
              const objType = obj.type.toUpperCase();
              const objPrefix = objType.split('/')[0];
              return (
                objectTypes.includes(objType) || objectTypes.includes(objPrefix)
              );
            }
          : undefined,
        onObject: (obj) => {
          ctx.logger.info(`   📄 ${obj.kind} ${obj.name}`);
        },
      },
    );

    const deployResult = await objectSet.deploy({
      transport: options.transport,
      activate: options.activate,
      mode: 'upsert',
      onProgress: (saved, total, obj) => {
        if (obj._unchanged) {
          ctx.logger.info(
            `   ⏭️ [${saved}/${total}] ${obj.kind} ${obj.name} (unchanged)`,
          );
        } else {
          ctx.logger.info(`   💾 [${saved}/${total}] ${obj.kind} ${obj.name}`);
        }
      },
    });

    ctx.logger.info(
      `   ✅ Deployed: ${deployResult.save.success} saved, ${deployResult.save.unchanged} unchanged, ${deployResult.save.failed} failed`,
    );

    if (deployResult.save.failed > 0) {
      ctx.logger.warn(
        `⚠️ ${deployResult.save.failed} object(s) failed to deploy — continuing roundtrip for ${deployResult.save.success + deployResult.save.unchanged} successful objects`,
      );
    }

    if (deployResult.save.success + deployResult.save.unchanged === 0) {
      ctx.logger.error('❌ No objects deployed successfully — aborting.');
      process.exit(1);
    }

    // Collect only successfully deployed objects for reimport
    for (const result of deployResult.save.results) {
      if (result.success) {
        deployedObjects.push(result.object);
      }
    }

    // ── Phase 2: Import back from SAP ──
    ctx.logger.info('\n═══ Phase 2: Import back from SAP ═══');

    if (!plugin.format.import) {
      ctx.logger.error(`❌ Plugin '${plugin.name}' does not support import`);
      process.exit(1);
    }

    const tmpDir = join(tmpdir(), `adt-roundtrip-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    ctx.logger.info(`   📂 Temp dir: ${tmpDir}`);

    const adk = createAdk(client as AdtClient);
    let reimported = 0;
    let reimportFailed = 0;

    for (const obj of deployedObjects) {
      try {
        // Load fresh from SAP
        const fresh = adk.get(obj.name, obj.type);
        await (fresh as any).load();

        // Build import context with package path resolver
        const importContext: ImportContext = {
          resolvePackagePath,
        };

        // Serialize back to local files using format plugin
        const result = await plugin.format.import(
          fresh as any,
          tmpDir,
          importContext,
        );

        if (result.success) {
          reimported++;
          ctx.logger.info(`   ✅ ${obj.kind} ${obj.name}`);
        } else {
          reimportFailed++;
          ctx.logger.error(
            `   ❌ ${obj.kind} ${obj.name}: ${result.errors?.join(', ') || 'unknown'}`,
          );
        }
      } catch (err) {
        reimportFailed++;
        ctx.logger.error(
          `   ❌ ${obj.kind} ${obj.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Call afterImport hook (generates .abapgit.xml etc)
    if (plugin.hooks?.afterImport) {
      await plugin.hooks.afterImport(tmpDir);
    }

    ctx.logger.info(
      `   📊 Reimported: ${reimported} success, ${reimportFailed} failed`,
    );

    // ── Phase 3: Compare ──
    ctx.logger.info('\n═══ Phase 3: Compare ═══');

    // Collect re-imported files (skip .abapgit.xml — generated metadata)
    const reimportedFiles = collectFiles(tmpDir).filter(
      (f) => !f.endsWith('.abapgit.xml'),
    );

    let matches = 0;
    let mismatches = 0;
    let onlyOriginal = 0;
    let onlyReimported = 0;

    // Map reimported files by their filename (last segment) for matching
    const reimportedByName = new Map<string, string>();
    for (const f of reimportedFiles) {
      const name = f.split('/').pop()!;
      reimportedByName.set(name, f);
    }

    // Get original files from the FileTree
    const originalXml = await fileTree.glob('**/*.xml');
    const originalAbap = await fileTree.glob('**/*.abap');
    const allOriginal = [...originalXml, ...originalAbap].filter(
      (f) => !f.endsWith('.abapgit.xml') && !f.endsWith('package.devc.xml'),
    );

    for (const origRelPath of allOriginal) {
      const origName = origRelPath.split('/').pop()!;
      const reimportedRelPath = reimportedByName.get(origName);

      if (!reimportedRelPath) {
        onlyOriginal++;
        ctx.logger.warn(`   ⚠️ Only in original: ${origName}`);
        continue;
      }

      // Remove from map so we can track reimported-only files
      reimportedByName.delete(origName);

      // Read original from FileTree, reimported from disk
      let origContent = (await fileTree.read(origRelPath)).trim();
      let reimContent = readFileSync(
        join(tmpDir, reimportedRelPath),
        'utf-8',
      ).trim();

      // Normalize line endings (SAP returns CRLF, git uses LF)
      origContent = origContent.replaceAll(/\r\n/g, '\n');
      reimContent = reimContent.replaceAll(/\r\n/g, '\n');

      // Normalize XML files before comparison
      const isXml = origName.endsWith('.xml');
      if (isXml) {
        origContent = await normalizeXml(origContent);
        reimContent = await normalizeXml(reimContent);

        // Save normalized files for inspection
        if (options.keepTmp) {
          writeFileSync(
            join(tmpDir, 'normalized-original-' + origName),
            origContent,
            'utf-8',
          );
          writeFileSync(
            join(tmpDir, 'normalized-reimported-' + origName),
            reimContent,
            'utf-8',
          );
        }
      }

      // Compare content
      if (origContent === reimContent) {
        matches++;
        ctx.logger.info(`   ✅ ${origName}`);
      } else {
        mismatches++;
        ctx.logger.error(`   ❌ ${origName} — DIFFERS`);

        // Generate unified diff
        const patch = createTwoFilesPatch(
          `original/${origName}`,
          `reimported/${origName}`,
          origContent,
          reimContent,
          '',
          '',
          { context: 3 },
        );

        // Show diff with colors (skip file headers, keep hunk headers)
        const diffLines = patch.split('\n');
        let lineCount = 0;
        const maxLines = 50;

        for (const line of diffLines) {
          // Skip file path headers (--- and +++)
          if (line.startsWith('---') || line.startsWith('+++')) {
            continue;
          }

          if (lineCount >= maxLines) {
            console.log(
              chalk.yellow(
                '      ... (truncated, use --keep-tmp to inspect full files)',
              ),
            );
            break;
          }

          if (line.startsWith('+')) {
            console.log(chalk.green(`      ${line}`));
          } else if (line.startsWith('-')) {
            console.log(chalk.red(`      ${line}`));
          } else if (line.startsWith('@@')) {
            console.log(chalk.cyan(`      ${line}`));
          } else if (line.trim()) {
            console.log(chalk.gray(`      ${line}`));
          }

          lineCount++;
        }
      }
    }

    // Files only in reimported
    for (const [name] of reimportedByName) {
      onlyReimported++;
      ctx.logger.warn(`   ⚠️ Only in reimported: ${name}`);
    }

    // ── Summary ──
    ctx.logger.info('\n═══ Summary ═══');
    ctx.logger.info(`   ✅ Matching: ${matches}`);
    if (mismatches > 0) ctx.logger.error(`   ❌ Mismatches: ${mismatches}`);
    if (onlyOriginal > 0)
      ctx.logger.warn(`   ⚠️ Only in original: ${onlyOriginal}`);
    if (onlyReimported > 0)
      ctx.logger.warn(`   ⚠️ Only in reimported: ${onlyReimported}`);

    if (options.keepTmp) {
      ctx.logger.info(`\n📂 Temp dir kept: ${tmpDir}`);
    } else {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    if (mismatches > 0) {
      ctx.logger.error('\n❌ Roundtrip test FAILED');
      process.exit(1);
    }

    ctx.logger.info('\n✅ Roundtrip test PASSED');
  },
};

export default roundtripCommand;
