/**
 * Export Command Plugin
 *
 * CLI-agnostic command for exporting local files to SAP.
 * Uses the CliContext for ADT client access.
 */

import type {
  CliCommandPlugin,
  CliContext,
  ExportOptions,
} from '@abapify/adt-plugin';
import {
  AdkObjectSet,
  AdkPackage,
  type AdkContext,
  tryGetGlobalContext,
} from '@abapify/adk';
import { createLockService, FileLockStore } from '@abapify/adt-locks';
import type {
  ExportResult,
  VerificationResult,
  VerificationDetail,
} from '../types';
import {
  createFileTree,
  FilteredFileTree,
  findAbapGitRoot,
  resolveFilesRelativeToRoot,
} from '../utils/filetree';
import { loadFormatPlugin } from '../utils/format-plugin';

/**
 * Display export results in console
 */
function displayExportResults(
  result: ExportResult,
  logger: CliContext['logger'],
): void {
  if (result.discovered === 0) {
    logger.warn('⚠️ No objects found to export');
    return;
  }

  logger.info('\n📊 Export Results:');
  logger.info(`   📦 Discovered: ${result.discovered}`);
  if (result.saved > 0) logger.info(`   💾 Saved: ${result.saved}`);
  if (result.activated > 0) logger.info(`   ✅ Activated: ${result.activated}`);
  if (result.skipped > 0) logger.info(`   ⏭️ Skipped: ${result.skipped}`);
  if (result.failed > 0) logger.error(`   ❌ Failed: ${result.failed}`);

  // Show failed objects
  const failed = result.objects.filter((o) => o.status === 'failed');
  if (failed.length > 0) {
    logger.error('\n❌ Failed objects:');
    for (const obj of failed.slice(0, 5)) {
      logger.error(
        `   ${obj.type} ${obj.name}: ${obj.error || 'unknown error'}`,
      );
    }
    if (failed.length > 5) {
      logger.error(`   ... (${failed.length - 5} more)`);
    }
  }
}

/**
 * Verify that deployed objects ended up in the expected SAP packages.
 *
 * Reloads each object from SAP and compares its current package
 * against the target package resolved from the abapGit folder structure.
 */
async function verifyPackageAssignments(
  objectSet: Iterable<import('@abapify/adk').AdkObject>,
  logger: CliContext['logger'],
): Promise<VerificationResult> {
  const verification: VerificationResult = {
    total: 0,
    correct: 0,
    mismatched: 0,
    errors: 0,
    details: [],
  };

  for (const obj of objectSet) {
    const targetPkg = (obj as any)._data?.packageRef?.name as
      | string
      | undefined;
    if (!targetPkg) continue;

    verification.total++;
    const detail: VerificationDetail = {
      type: obj.type,
      name: obj.name,
      expectedPackage: targetPkg,
      status: 'error',
    };

    try {
      // Reload from SAP to get current server state
      await obj.load();
      const actualPkg = (obj as any).package as string | undefined;
      detail.actualPackage = actualPkg ?? '';

      if (actualPkg === targetPkg) {
        detail.status = 'correct';
        verification.correct++;
      } else {
        detail.status = 'mismatched';
        verification.mismatched++;
        logger.warn(
          `   ⚠️ ${obj.name}: expected ${targetPkg}, got ${actualPkg ?? '(none)'}`,
        );
      }
    } catch (err) {
      detail.status = 'error';
      detail.error = err instanceof Error ? err.message : String(err);
      verification.errors++;
      logger.warn(`   ⚠️ ${obj.name}: verification failed — ${detail.error}`);
    }

    verification.details.push(detail);
  }

  return verification;
}

/**
 * Display verification results in console
 */
function displayVerificationResults(
  verification: VerificationResult,
  logger: CliContext['logger'],
): void {
  logger.info(`\n📋 Package Verification Results:`);
  logger.info(`   Total:      ${verification.total}`);
  logger.info(`   ✅ Correct:   ${verification.correct}`);
  if (verification.mismatched > 0) {
    logger.error(`   ❌ Mismatched: ${verification.mismatched}`);
  }
  if (verification.errors > 0) {
    logger.warn(`   ⚠️ Errors:    ${verification.errors}`);
  }

  // Show mismatched details
  const mismatches = verification.details.filter(
    (d) => d.status === 'mismatched',
  );
  if (mismatches.length > 0) {
    logger.error('\n❌ Package mismatches:');
    for (const m of mismatches) {
      logger.error(
        `   ${m.type} ${m.name}: expected ${m.expectedPackage}, got ${m.actualPackage ?? '(none)'}`,
      );
    }
  }
}

/**
 * Export Command Plugin
 *
 * Exports local serialized files to SAP system.
 *
 * Usage in adt.config.ts:
 * ```typescript
 * export default {
 *   commands: [
 *     '@abapify/adt-export/commands/export',
 *   ],
 * };
 * ```
 */
export const exportCommand: CliCommandPlugin = {
  name: 'export',
  alias: 'deploy',
  description: 'Export local files to SAP (deploy serialized objects)',

  arguments: [
    {
      name: '[files...]',
      description:
        'Specific files to deploy (e.g., zage_fixed_values.doma.xml). Omit to deploy all.',
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
      flags: '-t, --transport <request>',
      description: 'Transport request for changes',
    },
    {
      flags: '-p, --package <package>',
      description: 'Target package for new objects',
    },
    {
      flags: '--types <types>',
      description: 'Filter by object types (comma-separated, e.g., CLAS,INTF)',
    },
    {
      flags: '--dry-run',
      description: 'Validate without saving to SAP',
      default: false,
    },
    {
      flags: '--activate',
      description: 'Activate objects after deploy (use --no-activate to skip)',
      default: true,
    },
    {
      flags: '--unlock',
      description:
        'Force-unlock objects locked by current user before saving (auto-retry on 403)',
      default: false,
    },
    {
      flags: '--verify',
      description:
        'After deploy, verify each object ended up in the correct package on SAP',
      default: false,
    },
    {
      flags: '--abap-language-version <version>',
      description:
        'ABAP language version for new objects (2=keyUser, 5=cloud). Required for BTP systems.',
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
      dryRun?: boolean;
      activate?: boolean;
      unlock?: boolean;
      verify?: boolean;
      abapLanguageVersion?: string;
    };

    // Transport is optional:
    // - Objects in $TMP or local packages don't need TR
    // - Objects already locked in a TR will use that TR
    // - SAP will return an error if TR is required but not provided

    // Get ADT client from context
    if (!ctx.getAdtClient) {
      ctx.logger.error(
        '❌ ADT client not available. This command requires authentication.',
      );
      ctx.logger.error('   Run: adt auth login');
      process.exit(1);
    }

    // When specific files are provided, auto-resolve the abapGit repo root
    const specificFiles =
      options.files && options.files.length > 0 ? options.files : undefined;
    let sourcePath = options.source;

    if (specificFiles) {
      const repoRoot = findAbapGitRoot(ctx.cwd);
      if (!repoRoot) {
        ctx.logger.error('❌ No .abapgit.xml found in any parent directory.');
        ctx.logger.error(
          '   Run this command from within an abapGit repository.',
        );
        process.exit(1);
      }
      sourcePath = repoRoot;
    }

    // Early check: PREFIX folder logic requires an explicit --package flag.
    // Fail before scanning files / loading plugins / authenticating with SAP.
    if (!options.package) {
      const { readFileSync, existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      const abapGitXmlPath = join(sourcePath, '.abapgit.xml');
      if (existsSync(abapGitXmlPath)) {
        const xml = readFileSync(abapGitXmlPath, 'utf-8');
        const { parseAbapGitMetadata } =
          await import('@abapify/adt-plugin-abapgit');
        const { folderLogic } = parseAbapGitMetadata(xml);
        if (folderLogic === 'prefix') {
          ctx.logger.error(
            '❌ Root package is required for PREFIX folder logic.',
          );
          ctx.logger.info(
            '   Use -p <PACKAGE> to specify the root ABAP package.',
          );
          ctx.logger.info('   Example: npx adt export -p ZABAPGIT_EXAMPLES');
          process.exit(1);
        }
      }
    }

    ctx.logger.info('🚀 Starting export...');
    ctx.logger.info(`📁 Source: ${sourcePath}`);
    ctx.logger.info(`🎯 Format: ${options.format}`);
    if (specificFiles) ctx.logger.info(`📄 Files: ${specificFiles.join(', ')}`);
    if (options.transport)
      ctx.logger.info(`🚚 Transport: ${options.transport}`);
    if (options.package) ctx.logger.info(`📦 Package: ${options.package}`);
    if (options.dryRun) ctx.logger.info(`🔍 Mode: Dry run (no changes)`);

    // Create FileTree — wrap with filter when deploying specific files
    const fullFileTree = createFileTree(sourcePath);
    let fileTree = fullFileTree;
    if (specificFiles) {
      const relFiles = resolveFilesRelativeToRoot(
        specificFiles,
        ctx.cwd,
        sourcePath,
      );
      fileTree = new FilteredFileTree(fullFileTree, relFiles);
    }

    // Parse object types filter
    const objectTypes = options.types
      ? options.types.split(',').map((t) => t.trim().toUpperCase())
      : undefined;

    const result: ExportResult = {
      discovered: 0,
      saved: 0,
      activated: 0,
      skipped: 0,
      failed: 0,
      objects: [],
    };

    try {
      // Load format plugin
      ctx.logger.info(`📦 Loading format plugin: ${options.format}...`);
      const plugin = await loadFormatPlugin(options.format);

      // Check if plugin supports export
      if (!plugin.format.export) {
        ctx.logger.error(`❌ Plugin '${plugin.name}' does not support export`);
        ctx.logger.info(
          '   The plugin needs to implement format.export(fileTree) generator',
        );
        process.exit(1);
      }

      // Get ADT client and create ADK context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = (await ctx.getAdtClient!()) as any;
      // Reuse global context's lock service if available, otherwise create one
      const globalCtx = tryGetGlobalContext();
      const lockStore = globalCtx?.lockStore ?? new FileLockStore();
      const lockService =
        globalCtx?.lockService ??
        createLockService(client as any, { store: lockStore });
      const adkContext: AdkContext = {
        client: client as any,
        lockStore,
        lockService,
      };

      ctx.logger.info('🔍 Scanning files and building object tree...');

      // Build export options for the format plugin
      const exportOptions: ExportOptions = {
        rootPackage: options.package,
        abapLanguageVersion: options.abapLanguageVersion,
      };

      // Collect objects from plugin generator into AdkObjectSet
      const objectSet = await AdkObjectSet.fromGenerator(
        plugin.format.export(fileTree, client, exportOptions),
        adkContext,
        {
          filter: objectTypes
            ? (obj) => {
                // Match full type (CLAS/OC) or prefix (CLAS)
                const objType = obj.type.toUpperCase();
                const objPrefix = objType.split('/')[0];
                const included =
                  objectTypes.includes(objType) ||
                  objectTypes.includes(objPrefix);
                if (!included) {
                  result.skipped++;
                  result.objects.push({
                    type: obj.type,
                    name: obj.name,
                    status: 'skipped',
                  });
                }
                return included;
              }
            : undefined,
          onObject: (obj) => {
            result.discovered++;
            ctx.logger.info(`   📄 ${obj.kind} ${obj.name}`);
          },
        },
      );

      // Adjust discovered count (filter callback increments for skipped too)
      result.discovered += result.skipped;

      if (objectSet.isEmpty) {
        ctx.logger.warn('⚠️ No objects to export after filtering');
        displayExportResults(result, ctx.logger);
        return;
      }

      // Derive effective root package: either explicit --package or
      // resolved from objects that already have packageRef (e.g., from .abapgit.xml).
      //
      // When --package is provided, it's used as the root for folder logic.
      // When omitted, we look at objects that already have packageRef from
      // the format plugin and pick the shortest (= root-most) one.
      // If no root can be determined and folder logic is PREFIX, we require -p flag.
      let effectiveRootPackage = options.package;

      if (!effectiveRootPackage) {
        // Find root from objects that already have packageRef
        for (const obj of objectSet) {
          const pkgName = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (
            pkgName &&
            (!effectiveRootPackage ||
              pkgName.length < effectiveRootPackage.length)
          ) {
            effectiveRootPackage = pkgName;
          }
        }
      }

      // Log package assignments (resolved by format plugin)
      if (effectiveRootPackage) {
        const pkgMap = new Map<string, string[]>();
        for (const obj of objectSet) {
          const pkgName = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (pkgName) {
            if (!pkgMap.has(pkgName)) pkgMap.set(pkgName, []);
            pkgMap.get(pkgName)!.push(obj.name);
          }
        }
        if (pkgMap.size > 0) {
          ctx.logger.info(`📦 Package resolution: ${effectiveRootPackage}`);
          for (const [pkg, objects] of pkgMap) {
            if (pkg !== effectiveRootPackage) {
              ctx.logger.info(`   📁 ${pkg}: ${objects.join(', ')}`);
            }
          }
        }
      }

      // ============================================
      // Pre-deploy: validate root package exists on SAP
      // ============================================
      if (effectiveRootPackage && !options.dryRun) {
        const rootExists = await AdkPackage.exists(
          effectiveRootPackage,
          adkContext,
        );
        if (!rootExists) {
          ctx.logger.error(
            `❌ Root package ${effectiveRootPackage} does not exist on SAP.`,
          );
          ctx.logger.info(
            '   Create it first in ADT/Eclipse, or use -p with an existing package.',
          );
          process.exit(1);
        }
      }

      // ============================================
      // Pre-deploy: ensure subpackages exist
      // Collect all unique target packages and create any that
      // don't exist on the SAP system yet.
      // Packages are created top-down so that parent packages
      // exist before their children (correct superPackage).
      // ============================================
      if (effectiveRootPackage && !options.dryRun) {
        // Collect unique subpackage names from object targets
        const leafPackages = new Set<string>();
        for (const obj of objectSet) {
          const pkgName = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (pkgName && pkgName !== effectiveRootPackage) {
            leafPackages.add(pkgName);
          }
        }

        if (leafPackages.size > 0) {
          // Expand to include all intermediate packages in the hierarchy.
          // With PREFIX logic ROOT_A_B requires ROOT_A as an intermediate.
          const allSubPkgs = new Set<string>();
          const rootPrefix = effectiveRootPackage + '_';
          for (const pkg of leafPackages) {
            allSubPkgs.add(pkg);
            if (pkg.startsWith(rootPrefix)) {
              const suffix = pkg.slice(rootPrefix.length);
              const parts = suffix.split('_');
              let current = effectiveRootPackage;
              for (const part of parts) {
                current += '_' + part;
                allSubPkgs.add(current);
              }
            }
          }

          // Sort by name length — shorter names are higher in the hierarchy
          // and must be created first so they can serve as super packages.
          const sortedPkgs = [...allSubPkgs].sort(
            (a, b) => a.length - b.length,
          );

          ctx.logger.info(
            `\n📦 Checking ${sortedPkgs.length} subpackage(s)...`,
          );

          // Read root package to inherit software component, transport layer & responsible
          const rootPkg = await AdkPackage.get(
            effectiveRootPackage,
            adkContext,
          );

          // Build transport config once — SAP requires both softwareComponent
          // and transportLayer when transport element is present
          const swComp = rootPkg?.transport?.softwareComponent?.name;
          const trLayer = rootPkg?.transport?.transportLayer?.name;
          const transportConfig =
            swComp || trLayer
              ? {
                  softwareComponent: { name: swComp ?? '' },
                  transportLayer: { name: trLayer ?? '' },
                }
              : undefined;

          // Track known packages for super-package resolution
          const knownPackages = new Set<string>([effectiveRootPackage]);
          const fixedPackages: string[] = [];

          for (const pkgName of sortedPkgs) {
            // Resolve expected super package: longest known package
            // that is a proper prefix of this one (with '_' separator).
            let expectedSuper = effectiveRootPackage;
            for (const candidate of knownPackages) {
              if (
                pkgName.startsWith(candidate + '_') &&
                candidate.length > expectedSuper.length
              ) {
                expectedSuper = candidate;
              }
            }

            const exists = await AdkPackage.exists(pkgName, adkContext);
            if (exists) {
              knownPackages.add(pkgName);

              // Verify super package — fix if wrong (e.g. from a prior buggy deploy)
              try {
                const pkg = await AdkPackage.get(pkgName, adkContext);
                const currentSuper = pkg.superPackage?.name ?? '';
                if (currentSuper && currentSuper !== expectedSuper) {
                  ctx.logger.info(
                    `   📦 Fixing ${pkgName}: ${currentSuper} → ${expectedSuper}`,
                  );
                  // Use raw HTTP calls matching the exact SAP ADT sequence:
                  // 1. LOCK (accessMode=MODIFY)
                  // 2. GET ?version=inactive
                  // 3. PUT ?lockHandle=...  (with modified superPackage)
                  // 4. UNLOCK ?lockHandle=...
                  const pkgUri = `/sap/bc/adt/packages/${encodeURIComponent(pkgName)}`;
                  const acceptHeader =
                    'application/vnd.sap.adt.packages.v2+xml, application/vnd.sap.adt.packages.v1+xml';

                  // Force-unlock first in case a previous run left it locked
                  if (options.unlock) {
                    try {
                      const lockSvc = adkContext.lockService;
                      if (lockSvc) {
                        await lockSvc.forceUnlock(pkgUri);
                      }
                    } catch {
                      // Not locked — fine
                    }
                  }

                  // Step 1: LOCK via lockService
                  const lockSvc = adkContext.lockService;
                  if (!lockSvc) {
                    throw new Error('lockService not available in context');
                  }
                  const lockResult = await lockSvc.lock(pkgUri, {
                    transport: options.transport,
                    objectName: pkgName,
                    objectType: 'DEVC/K',
                  });
                  const lockHandle = lockResult.handle;

                  try {
                    // Step 2: GET inactive version (fresh ETag + modifiable copy)
                    const inactiveXml = (await client.fetch(
                      `${pkgUri}?version=inactive`,
                      {
                        method: 'GET',
                        headers: { Accept: acceptHeader },
                      },
                    )) as string;

                    // Step 3: PUT with modified superPackage
                    // Replace the superPackage reference in the XML
                    // The XML uses adtcore:name and adtcore:uri attributes
                    let modifiedXml = inactiveXml;
                    // Replace superPackage name attribute (adtcore:name="...")
                    modifiedXml = modifiedXml.replace(
                      /(<pak:superPackage[^>]*adtcore:name=")([^"]*)(")/,
                      `$1${expectedSuper}$3`,
                    );
                    // Replace superPackage URI attribute (adtcore:uri="...")
                    modifiedXml = modifiedXml.replace(
                      /(<pak:superPackage[^>]*adtcore:uri=")([^"]*)(")/,
                      `$1/sap/bc/adt/packages/${expectedSuper.toLowerCase()}$3`,
                    );

                    await client.fetch(
                      `${pkgUri}?lockHandle=${encodeURIComponent(lockHandle)}`,
                      {
                        method: 'PUT',
                        headers: {
                          'Content-Type':
                            'application/vnd.sap.adt.packages.v2+xml',
                          Accept: acceptHeader,
                        },
                        body: modifiedXml,
                      },
                    );
                    ctx.logger.info(`   ✅ Fixed ${pkgName}`);
                    fixedPackages.push(pkgName);
                  } finally {
                    // Step 4: UNLOCK (always, to prevent orphan locks)
                    try {
                      await lockSvc.unlock(pkgUri, { lockHandle });
                    } catch {
                      // Best-effort unlock
                    }
                  }
                }
              } catch (fixErr) {
                ctx.logger.warn(
                  `   ⚠️ Could not fix super package for ${pkgName}: ${fixErr instanceof Error ? fixErr.message : String(fixErr)}`,
                );
              }
              continue;
            }

            ctx.logger.info(
              `   📦 Creating subpackage ${pkgName} (in ${expectedSuper})...`,
            );
            try {
              // Use root package's responsible, but fall back to the
              // authenticated user when root is a system package like $TMP
              // (whose responsible is 'SAP', which SAP rejects on creation).
              let responsible = rootPkg?.dataSync?.responsible ?? '';
              if (!responsible || responsible.toUpperCase() === 'SAP') {
                responsible = (client as any).username?.toUpperCase?.() ?? '';
              }

              await AdkPackage.create(
                pkgName,
                {
                  description: pkgName,
                  responsible,
                  superPackage: { name: expectedSuper },
                  attributes: {
                    packageType: 'development',
                    ...(options.abapLanguageVersion
                      ? {
                          languageVersion: options.abapLanguageVersion as
                            | ''
                            | '2'
                            | '5',
                        }
                      : {}),
                  },
                  ...(transportConfig ? { transport: transportConfig } : {}),
                },
                { transport: options.transport },
                adkContext,
              );
              knownPackages.add(pkgName);
              ctx.logger.info(`   ✅ Created ${pkgName}`);
            } catch (createErr) {
              const errMsg =
                createErr instanceof Error
                  ? createErr.message
                  : String(createErr);
              // Check if the package actually exists now (race condition or partial success)
              const existsNow = await AdkPackage.exists(pkgName, adkContext);
              if (existsNow) {
                knownPackages.add(pkgName);
                ctx.logger.info(`   ✅ ${pkgName} already exists`);
              } else {
                // Provide actionable guidance for common failures
                if (
                  errMsg.includes('409') ||
                  errMsg.includes('change request') ||
                  errMsg.includes('authorization')
                ) {
                  ctx.logger.warn(
                    `   ⚠️ Failed to create ${pkgName}: ${errMsg}`,
                  );
                  ctx.logger.warn(
                    `      💡 Hint: Use -t <transport> for non-local packages, or -p '$TMP' for local development`,
                  );
                } else {
                  ctx.logger.warn(
                    `   ⚠️ Failed to create ${pkgName}: ${errMsg}`,
                  );
                }
              }
            }
          }

          // Step 5: Activate fixed packages so changes move from inactive → active
          if (fixedPackages.length > 0) {
            const refs = fixedPackages
              .map(
                (p) =>
                  `  <adtcore:objectReference adtcore:uri="/sap/bc/adt/packages/${encodeURIComponent(p)}" adtcore:type="DEVC/K" adtcore:name="${p}"/>`,
              )
              .join('\n');
            const activationXml = `<?xml version="1.0" encoding="UTF-8"?>\n<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">\n${refs}\n</adtcore:objectReferences>`;
            try {
              await client.fetch(
                '/sap/bc/adt/activation?method=activate&preauditRequested=true',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/xml',
                    Accept: 'application/xml',
                  },
                  body: activationXml,
                },
              );
              ctx.logger.info(
                `   ✅ Activated ${fixedPackages.length} fixed package(s)`,
              );
            } catch (actErr) {
              ctx.logger.warn(
                `   ⚠️ Package activation failed: ${actErr instanceof Error ? actErr.message : String(actErr)}`,
              );
            }
          }
        }
      }

      // ============================================
      // Pre-deploy: remove objects targeting unavailable packages
      // If subpackage creation failed and the package doesn't exist,
      // skip all objects targeting it to prevent cascade failures.
      // ============================================
      const unavailablePackages = new Set<string>();
      if (effectiveRootPackage && !options.dryRun) {
        // Check which sub-packages actually exist on SAP; skip objects
        // targeting unavailable ones to prevent cascade failures.
        const objectsByPkg = new Map<string, any[]>();
        for (const obj of objectSet) {
          const pkgName = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (pkgName && pkgName !== effectiveRootPackage) {
            if (!objectsByPkg.has(pkgName)) objectsByPkg.set(pkgName, []);
            objectsByPkg.get(pkgName)!.push(obj);
          }
        }
        for (const [pkgName] of objectsByPkg) {
          const exists = await AdkPackage.exists(pkgName, adkContext);
          if (!exists) {
            unavailablePackages.add(pkgName);
          }
        }

        if (unavailablePackages.size > 0) {
          // Remove objects targeting unavailable packages from the object set
          const removedObjects: string[] = [];
          const removedNames = new Set<string>();
          for (const obj of [...objectSet]) {
            const pkgName = (obj as any)._data?.packageRef?.name as
              | string
              | undefined;
            if (pkgName && unavailablePackages.has(pkgName)) {
              objectSet.remove(obj);
              removedObjects.push(`${(obj as any).kind} ${obj.name}`);
              removedNames.add(obj.name.toUpperCase());
            }
          }

          // Also remove child objects whose parent was removed.
          // E.g., function modules whose parent function group was skipped.
          if (removedNames.size > 0) {
            for (const obj of [...objectSet]) {
              const groupName = (obj as any).groupName as string | undefined;
              const containerName = (
                (obj as any)._data?.containerRef?.name as string | undefined
              )?.toUpperCase();
              const parentName = groupName?.toUpperCase() ?? containerName;
              if (parentName && removedNames.has(parentName)) {
                objectSet.remove(obj);
                removedObjects.push(`${(obj as any).kind} ${obj.name}`);
              }
            }
          }

          if (removedObjects.length > 0) {
            ctx.logger.warn(
              `\n⚠️ Skipping ${removedObjects.length} object(s) — target package does not exist:`,
            );
            for (const name of removedObjects) {
              ctx.logger.warn(`   ⏭️ ${name}`);
            }
            for (const pkg of unavailablePackages) {
              ctx.logger.warn(
                `   📦 ${pkg} — create it first, or use -p <existing-package>`,
              );
            }
          }
        }
      }

      // ============================================
      // Pre-deploy: delete objects in wrong package
      // SAP ignores packageRef on PUT (update), so if an object
      // already exists in a different package we must delete it
      // first and let the deploy recreate it in the correct one.
      // ============================================
      if (effectiveRootPackage && !options.dryRun) {
        let deletedForReassign = 0;
        for (const obj of objectSet) {
          const targetPkg = (obj as any)._data?.packageRef?.name as
            | string
            | undefined;
          if (!targetPkg) continue;

          try {
            // Save local _data before load() — load() overwrites _data with
            // SAP's current server state, destroying abapGit-sourced fields.
            const localData = (obj as any)._data;

            // Try loading existing object from SAP
            await obj.load();
            const currentPkg = (obj as any).package as string | undefined;

            // Restore the abapGit-sourced data (load was only for package check)
            (obj as any)._data = localData;

            if (!currentPkg || currentPkg === targetPkg) continue;

            // Object exists in wrong package — delete so deploy recreates it
            ctx.logger.info(
              `   📦 ${obj.name}: ${currentPkg} → ${targetPkg} (will delete + recreate)`,
            );

            const contract = (obj as any).crudContract;
            if (contract?.delete) {
              const lockHandle = await obj.lock(options.transport);
              await contract.delete(obj.name, {
                lockHandle: lockHandle.handle,
                corrNr: options.transport,
              });
              // Clear internal state so deploy treats this as a new object
              (obj as any)._data.packageRef = { name: targetPkg };
              (obj as any)._lockHandle = undefined;
              deletedForReassign++;
            }
          } catch (err) {
            // Object doesn't exist yet (404) or load failed — that's fine,
            // the deploy will create it in the correct package
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('404') && !msg.includes('not found')) {
              ctx.logger.warn(`   ⚠️ Pre-deploy check for ${obj.name}: ${msg}`);
            }
          }
        }
        if (deletedForReassign > 0) {
          ctx.logger.info(
            `📦 ${deletedForReassign} object(s) deleted for package reassignment`,
          );
        }
      }

      // ============================================
      // Pre-deploy: force-unlock all objects (--unlock)
      // ============================================
      if (options.unlock && !options.dryRun) {
        ctx.logger.info(
          `\n🔓 --unlock: Force-unlocking all ${objectSet.size} objects...`,
        );
        let unlocked = 0;
        const lockSvc = adkContext.lockService;
        if (!lockSvc) {
          ctx.logger.warn(
            '⚠️ lockService not available — skipping force-unlock',
          );
        } else {
          for (const obj of objectSet) {
            try {
              await lockSvc.forceUnlock(obj.objectUri);
              unlocked++;
            } catch {
              // Object wasn't locked or locked by another user — ignore
            }
          }
          if (unlocked > 0) {
            ctx.logger.info(`   🔓 ${unlocked} object(s) unlocked`);
          }
        }
      }

      // ============================================
      // Deploy using AdkObjectSet (save + activate)
      // ============================================
      if (!options.dryRun) {
        ctx.logger.info(`\n� Deploying ${objectSet.size} objects...`);

        // Use AdkObjectSet.deploy() for save inactive + bulk activate
        // Use 'upsert' mode: tries lock first (update existing), falls back to create if not found
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
              ctx.logger.info(
                `   💾 [${saved}/${total}] ${obj.kind} ${obj.name}`,
              );
            }
          },
        });

        // Map save results
        result.saved = deployResult.save.success;
        result.failed = deployResult.save.failed;

        for (const r of deployResult.save.results) {
          if (r.unchanged) {
            result.skipped++;
            result.objects.push({
              type: r.object.type,
              name: r.object.name,
              status: 'skipped',
              error: 'unchanged',
            });
          } else {
            result.objects.push({
              type: r.object.type,
              name: r.object.name,
              status: r.success ? 'saved' : 'failed',
              error: r.error,
            });
          }
        }

        // Log unchanged objects
        if (deployResult.save.unchanged > 0) {
          const unchangedNames = deployResult.save.results
            .filter((r) => r.unchanged)
            .map((r) => r.object.name);
          ctx.logger.info(
            `\n⏭️ ${deployResult.save.unchanged} unchanged: ${unchangedNames.join(', ')}`,
          );
        }

        // Map activation results
        if (deployResult.activation) {
          result.activated = deployResult.activation.success;

          if (deployResult.activation.success > 0) {
            ctx.logger.info(
              `\n✅ ${deployResult.activation.success} objects activated`,
            );
          }
          if (deployResult.activation.failed > 0) {
            ctx.logger.warn(
              `⚠️ ${deployResult.activation.failed} objects failed activation`,
            );
            for (const msg of deployResult.activation.messages) {
              ctx.logger.warn(`   ${msg}`);
            }
          }
        }
        // Note: deploy() handles unlockAll() automatically
      } else {
        // Dry run - just mark as would-be-saved
        for (const obj of objectSet) {
          result.objects.push({
            type: obj.type,
            name: obj.name,
            status: 'saved', // Would be saved
          });
        }
        result.saved = objectSet.size;
        ctx.logger.info(
          `\n🔍 Dry run: ${objectSet.size} objects would be saved`,
        );
      }

      // ============================================
      // Post-deploy: verify package assignments
      // ============================================
      if (options.verify && !options.dryRun) {
        ctx.logger.info(
          `\n🔍 Verifying package assignments for ${objectSet.size} objects...`,
        );
        result.verification = await verifyPackageAssignments(
          objectSet,
          ctx.logger,
        );
        displayVerificationResults(result.verification, ctx.logger);
      }
    } catch (error) {
      ctx.logger.error(
        `❌ Export failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }

    // Display results
    displayExportResults(result, ctx.logger);

    // Exit with error if there were failures or verification mismatches
    if (result.failed > 0 || (result.verification?.mismatched ?? 0) > 0) {
      process.exit(1);
    }
  },
};

export default exportCommand;
