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
      string | undefined;
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
/** CLI options parsed for the `export` command. */
interface ExportCliOptions {
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
}

/** The ADT client as handed over by the CLI context (ADK-compatible). */
type ExportClient = AdkContext['client'];

/** Shared client + context threading through the export pre-deploy helpers. */
interface ExportContext {
  client: ExportClient;
  adkContext: AdkContext;
  ctx: CliContext;
}

/** Inputs for creating one missing subpackage under its expected super. */
interface SubpackagePlan {
  pkgName: string;
  expectedSuper: string;
  /** Root package read from SAP — source of responsible / transport inheritance. */
  rootPkg: Awaited<ReturnType<typeof AdkPackage.get>> | undefined;
  /** Transport config inherited from the root package (SAP needs both fields). */
  transportConfig:
    | {
        softwareComponent: { name: string };
        transportLayer: { name: string };
      }
    | undefined;
}

/**
 * Early check: PREFIX folder logic requires an explicit --package flag.
 * Fail before scanning files / loading plugins / authenticating with SAP.
 */
async function checkPrefixFolderLogic(
  sourcePath: string,
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<void> {
  if (options.package) return;

  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const abapGitXmlPath = join(sourcePath, '.abapgit.xml');
  if (!existsSync(abapGitXmlPath)) return;

  const xml = readFileSync(abapGitXmlPath, 'utf-8');
  const { parseAbapGitMetadata } = await import('@abapify/adt-plugin-abapgit');
  const { folderLogic } = parseAbapGitMetadata(xml);
  if (folderLogic === 'prefix') {
    ctx.logger.error('❌ Root package is required for PREFIX folder logic.');
    ctx.logger.info('   Use -p <PACKAGE> to specify the root ABAP package.');
    ctx.logger.info('   Example: npx adt export -p ZABAPGIT_EXAMPLES');
    process.exit(1);
  }
}

/** Rewrite the `<pak:superPackage .../>` tag attributes (ReDoS-free scan). */
function rewriteSuperPackageTag(xml: string, expectedSuper: string): string {
  const tagStart = xml.indexOf('<pak:superPackage');
  if (tagStart === -1) return xml;
  const tagEnd = xml.indexOf('>', tagStart);
  if (tagEnd === -1) return xml;

  const before = xml.slice(0, tagStart);
  const tag = xml.slice(tagStart, tagEnd + 1);
  const after = xml.slice(tagEnd + 1);

  const replaceAttr = (src: string, attr: string, newValue: string): string => {
    const needle = `${attr}="`;
    const a = src.indexOf(needle);
    if (a === -1) return src;
    const valStart = a + needle.length;
    const valEnd = src.indexOf('"', valStart);
    if (valEnd === -1) return src;
    return src.slice(0, valStart) + newValue + src.slice(valEnd);
  };

  let newTag = replaceAttr(tag, 'adtcore:name', expectedSuper);
  newTag = replaceAttr(
    newTag,
    'adtcore:uri',
    `/sap/bc/adt/packages/${expectedSuper.toLowerCase()}`,
  );
  return before + newTag + after;
}

/**
 * Fix a wrong super package of an existing subpackage (e.g. from a prior
 * buggy deploy) using the raw SAP ADT sequence:
 * 1. LOCK (accessMode=MODIFY)
 * 2. GET ?version=inactive
 * 3. PUT ?lockHandle=...  (with modified superPackage)
 * 4. UNLOCK ?lockHandle=...
 */
async function fixSuperPackage(
  pkgName: string,
  expectedSuper: string,
  context: ExportContext,
  options: ExportCliOptions,
): Promise<void> {
  const { client, adkContext, ctx } = context;
  const pkgUri = `/sap/bc/adt/packages/${encodeURIComponent(pkgName)}`;
  const acceptHeader =
    'application/vnd.sap.adt.packages.v2+xml, application/vnd.sap.adt.packages.v1+xml';

  // Recover a persisted lock first if a previous run crashed.
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
    const inactiveXml = (await client.fetch(`${pkgUri}?version=inactive`, {
      method: 'GET',
      headers: { Accept: acceptHeader },
    })) as string;

    // Step 3: PUT with modified superPackage
    // Replace the superPackage reference in the XML.
    // Use a linear scan to locate the <pak:superPackage ...>
    // tag and rewrite its adtcore:name / adtcore:uri attributes
    // without relying on regex backtracking (avoids ReDoS).
    const modifiedXml = rewriteSuperPackageTag(inactiveXml, expectedSuper);

    await client.fetch(
      `${pkgUri}?lockHandle=${encodeURIComponent(lockHandle)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/vnd.sap.adt.packages.v2+xml',
          Accept: acceptHeader,
        },
        body: modifiedXml,
      },
    );
    ctx.logger.info(`   ✅ Fixed ${pkgName}`);
  } finally {
    // Step 4: UNLOCK (always, to prevent orphan locks)
    try {
      await lockSvc.unlock(pkgUri, { lockHandle });
    } catch {
      // Best-effort unlock
    }
  }
}

/**
 * Create a missing subpackage under `expectedSuper`, inheriting software
 * component / transport layer / responsible from the root package.
 * Returns true when the package is known to exist afterwards.
 */
async function createSubpackage(
  plan: SubpackagePlan,
  context: ExportContext,
  options: ExportCliOptions,
): Promise<boolean> {
  const { client, adkContext, ctx } = context;
  const { pkgName, expectedSuper, rootPkg, transportConfig } = plan;
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
                languageVersion: options.abapLanguageVersion as '' | '2' | '5',
              }
            : {}),
        },
        ...(transportConfig ? { transport: transportConfig } : {}),
      },
      { transport: options.transport },
      adkContext,
    );
    ctx.logger.info(`   ✅ Created ${pkgName}`);
    return true;
  } catch (createErr) {
    const errMsg =
      createErr instanceof Error ? createErr.message : String(createErr);
    // Check if the package actually exists now (race condition or partial success)
    const existsNow = await AdkPackage.exists(pkgName, adkContext);
    if (existsNow) {
      ctx.logger.info(`   ✅ ${pkgName} already exists`);
      return true;
    }
    ctx.logger.warn(`   ⚠️ Failed to create ${pkgName}: ${errMsg}`);
    if (
      // Provide actionable guidance for common failures
      errMsg.includes('409') ||
      errMsg.includes('change request') ||
      errMsg.includes('authorization')
    ) {
      ctx.logger.warn(
        `      💡 Hint: Use -t <transport> for non-local packages, or -p '$TMP' for local development`,
      );
    }
    return false;
  }
}

/** Activate fixed packages so changes move from inactive → active. */
async function activateFixedPackages(
  fixedPackages: string[],
  context: ExportContext,
): Promise<void> {
  const { client, ctx } = context;
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
    ctx.logger.info(`   ✅ Activated ${fixedPackages.length} fixed package(s)`);
  } catch (actErr) {
    ctx.logger.warn(
      `   ⚠️ Package activation failed: ${actErr instanceof Error ? actErr.message : String(actErr)}`,
    );
  }
}

/**
 * Expand the leaf packages into all intermediate packages of the PREFIX
 * hierarchy and sort them top-down (shorter names first).
 */
function expandSubpackageHierarchy(
  leafPackages: Set<string>,
  effectiveRootPackage: string,
): string[] {
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
  return [...allSubPkgs].sort((a, b) => a.length - b.length);
}

/**
 * Resolve the expected super package: the longest known package that is a
 * proper prefix of `pkgName` (with '_' separator).
 */
function resolveExpectedSuper(
  knownPackages: Set<string>,
  pkgName: string,
  root: string,
): string {
  let expectedSuper = root;
  for (const candidate of knownPackages) {
    if (
      pkgName.startsWith(candidate + '_') &&
      candidate.length > expectedSuper.length
    ) {
      expectedSuper = candidate;
    }
  }
  return expectedSuper;
}

/**
 * Verify the super package of an existing subpackage and fix it when wrong
 * (e.g. from a prior buggy deploy). Returns true when it was fixed.
 */
async function verifyAndFixSuperPackage(
  pkgName: string,
  expectedSuper: string,
  context: ExportContext,
  options: ExportCliOptions,
): Promise<boolean> {
  const { adkContext, ctx } = context;
  try {
    const pkg = await AdkPackage.get(pkgName, adkContext);
    const currentSuper = pkg.superPackage?.name ?? '';
    if (currentSuper && currentSuper !== expectedSuper) {
      ctx.logger.info(
        `   📦 Fixing ${pkgName}: ${currentSuper} → ${expectedSuper}`,
      );
      await fixSuperPackage(pkgName, expectedSuper, context, options);
      return true;
    }
  } catch (fixErr) {
    ctx.logger.warn(
      `   ⚠️ Could not fix super package for ${pkgName}: ${fixErr instanceof Error ? fixErr.message : String(fixErr)}`,
    );
  }
  return false;
}

/**
 * Pre-deploy: ensure subpackages exist.
 *
 * Collect all unique target packages and create any that don't exist on the
 * SAP system yet. Packages are created top-down so that parent packages
 * exist before their children (correct superPackage). Wrong super package
 * references on existing packages are fixed and activated.
 */
async function ensureSubpackages(
  objectSet: AdkObjectSet,
  effectiveRootPackage: string,
  context: ExportContext,
  options: ExportCliOptions,
): Promise<void> {
  const { adkContext, ctx } = context;
  // Collect unique subpackage names from object targets
  const leafPackages = new Set<string>();
  for (const obj of objectSet) {
    const pkgName = (obj as any)._data?.packageRef?.name as string | undefined;
    if (pkgName && pkgName !== effectiveRootPackage) {
      leafPackages.add(pkgName);
    }
  }
  if (leafPackages.size === 0) return;

  const sortedPkgs = expandSubpackageHierarchy(
    leafPackages,
    effectiveRootPackage,
  );

  ctx.logger.info(`\n📦 Checking ${sortedPkgs.length} subpackage(s)...`);

  // Read root package to inherit software component, transport layer & responsible
  const rootPkg = await AdkPackage.get(effectiveRootPackage, adkContext);

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
    const expectedSuper = resolveExpectedSuper(
      knownPackages,
      pkgName,
      effectiveRootPackage,
    );

    const exists = await AdkPackage.exists(pkgName, adkContext);
    if (exists) {
      knownPackages.add(pkgName);

      // Verify super package — fix if wrong (e.g. from a prior buggy deploy)
      const fixed = await verifyAndFixSuperPackage(
        pkgName,
        expectedSuper,
        context,
        options,
      );
      if (fixed) fixedPackages.push(pkgName);
      continue;
    }

    const created = await createSubpackage(
      { pkgName, expectedSuper, rootPkg, transportConfig },
      context,
      options,
    );
    if (created) knownPackages.add(pkgName);
  }

  // Step 5: Activate fixed packages so changes move from inactive → active
  if (fixedPackages.length > 0) {
    await activateFixedPackages(fixedPackages, context);
  }
}

/** Group objects by their target subpackage (root-package objects excluded). */
function groupObjectsByPackage(
  objectSet: AdkObjectSet,
  effectiveRootPackage: string,
): Map<string, unknown[]> {
  const objectsByPkg = new Map<string, unknown[]>();
  for (const obj of objectSet) {
    const pkgName = (obj as any)._data?.packageRef?.name as string | undefined;
    if (pkgName && pkgName !== effectiveRootPackage) {
      if (!objectsByPkg.has(pkgName)) objectsByPkg.set(pkgName, []);
      objectsByPkg.get(pkgName)!.push(obj);
    }
  }
  return objectsByPkg;
}

/**
 * Remove child objects whose parent was removed (e.g., function modules
 * whose parent function group was skipped).
 */
function removeChildrenOfRemoved(
  objectSet: AdkObjectSet,
  removedNames: Set<string>,
  removedObjects: string[],
): void {
  if (removedNames.size === 0) return;
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

/** Log every skipped object and the packages that are missing on SAP. */
function logSkippedObjects(
  removedObjects: string[],
  unavailablePackages: Set<string>,
  ctx: CliContext,
): void {
  if (removedObjects.length === 0) return;
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

/**
 * Pre-deploy: remove objects targeting unavailable packages.
 *
 * If subpackage creation failed and the package doesn't exist, skip all
 * objects targeting it to prevent cascade failures.
 */
async function skipObjectsInUnavailablePackages(
  objectSet: AdkObjectSet,
  effectiveRootPackage: string,
  context: ExportContext,
): Promise<void> {
  const { adkContext, ctx } = context;
  // Check which sub-packages actually exist on SAP; skip objects
  // targeting unavailable ones to prevent cascade failures.
  const objectsByPkg = groupObjectsByPackage(objectSet, effectiveRootPackage);

  const unavailablePackages = new Set<string>();
  for (const [pkgName] of objectsByPkg) {
    const exists = await AdkPackage.exists(pkgName, adkContext);
    if (!exists) {
      unavailablePackages.add(pkgName);
    }
  }
  if (unavailablePackages.size === 0) return;

  // Remove objects targeting unavailable packages from the object set
  const removedObjects: string[] = [];
  const removedNames = new Set<string>();
  for (const obj of [...objectSet]) {
    const pkgName = (obj as any)._data?.packageRef?.name as string | undefined;
    if (pkgName && unavailablePackages.has(pkgName)) {
      objectSet.remove(obj);
      removedObjects.push(`${(obj as any).kind} ${obj.name}`);
      removedNames.add(obj.name.toUpperCase());
    }
  }

  // Also remove child objects whose parent was removed.
  removeChildrenOfRemoved(objectSet, removedNames, removedObjects);

  logSkippedObjects(removedObjects, unavailablePackages, ctx);
}

/** Delete one object that sits in the wrong package; true when deleted. */
async function reassignObjectPackage(
  obj: AdkObject,
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<boolean> {
  const targetPkg = (obj as any)._data?.packageRef?.name as string | undefined;
  if (!targetPkg) return false;

  try {
    // Save local _data before load() — load() overwrites _data with
    // SAP's current server state, destroying abapGit-sourced fields.
    const localData = (obj as any)._data;

    // Try loading existing object from SAP
    await obj.load();
    const currentPkg = (obj as any).package as string | undefined;

    // Restore the abapGit-sourced data (load was only for package check)
    (obj as any)._data = localData;

    if (!currentPkg || currentPkg === targetPkg) return false;

    // Object exists in wrong package — delete so deploy recreates it
    ctx.logger.info(
      `   📦 ${obj.name}: ${currentPkg} → ${targetPkg} (will delete + recreate)`,
    );

    const contract = (obj as any).crudContract;
    if (!contract?.delete) return false;

    const lockHandle = await obj.lock(options.transport);
    await contract.delete(obj.name, {
      lockHandle: lockHandle.handle,
      corrNr: options.transport,
    });
    // Clear internal state so deploy treats this as a new object
    (obj as any)._data.packageRef = { name: targetPkg };
    (obj as any)._lockHandle = undefined;
    return true;
  } catch (err) {
    // Object doesn't exist yet (404) or load failed — that's fine,
    // the deploy will create it in the correct package
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('404') && !msg.includes('not found')) {
      ctx.logger.warn(`   ⚠️ Pre-deploy check for ${obj.name}: ${msg}`);
    }
    return false;
  }
}

/**
 * Pre-deploy: delete objects in the wrong package.
 *
 * SAP ignores packageRef on PUT (update), so if an object already exists in
 * a different package we must delete it first and let the deploy recreate
 * it in the correct one.
 */
async function deleteObjectsInWrongPackage(
  objectSet: AdkObjectSet,
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<void> {
  let deletedForReassign = 0;
  for (const obj of objectSet) {
    const deleted = await reassignObjectPackage(obj, options, ctx);
    if (deleted) deletedForReassign++;
  }
  if (deletedForReassign > 0) {
    ctx.logger.info(
      `📦 ${deletedForReassign} object(s) deleted for package reassignment`,
    );
  }
}

/** Pre-deploy: recover persisted object locks (--unlock). */
async function recoverPersistedLocks(
  objectSet: AdkObjectSet,
  context: ExportContext,
): Promise<void> {
  const { adkContext, ctx } = context;
  ctx.logger.info(
    `\n🔓 --unlock: Recovering persisted locks for ${objectSet.size} objects...`,
  );
  let unlocked = 0;
  const lockSvc = adkContext.lockService;
  if (!lockSvc) {
    ctx.logger.warn(
      '⚠️ lockService not available — skipping persisted-lock recovery',
    );
    return;
  }
  for (const obj of objectSet) {
    try {
      await lockSvc.forceUnlock(obj.objectUri);
      unlocked++;
    } catch {
      // No persisted handle, or SAP rejected it — deploy will surface
      // an actionable lock conflict if the object remains locked.
    }
  }
  if (unlocked > 0) {
    ctx.logger.info(`   🔓 ${unlocked} object(s) unlocked`);
  }
}

/** Log package assignments (resolved by the format plugin). */
function logPackageAssignments(
  objectSet: AdkObjectSet,
  effectiveRootPackage: string,
  ctx: CliContext,
): void {
  const pkgMap = new Map<string, string[]>();
  for (const obj of objectSet) {
    const pkgName = (obj as any)._data?.packageRef?.name as string | undefined;
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

/**
 * Derive the effective root package: either explicit --package or resolved
 * from objects that already have packageRef (e.g., from .abapgit.xml).
 *
 * When --package is provided, it's used as the root for folder logic.
 * When omitted, we look at objects that already have packageRef from the
 * format plugin and pick the shortest (= root-most) one.
 */
function resolveEffectiveRootPackage(
  objectSet: AdkObjectSet,
  options: ExportCliOptions,
  ctx: CliContext,
): string | undefined {
  let effectiveRootPackage = options.package;

  if (!effectiveRootPackage) {
    // Find root from objects that already have packageRef
    for (const obj of objectSet) {
      const pkgName = (obj as any)._data?.packageRef?.name as
        string | undefined;
      if (
        pkgName &&
        (!effectiveRootPackage || pkgName.length < effectiveRootPackage.length)
      ) {
        effectiveRootPackage = pkgName;
      }
    }
  }

  // Log package assignments (resolved by format plugin)
  if (effectiveRootPackage) {
    logPackageAssignments(objectSet, effectiveRootPackage, ctx);
  }

  return effectiveRootPackage;
}

/** Pre-deploy: validate the root package exists on SAP. */
async function ensureRootPackageExists(
  effectiveRootPackage: string,
  context: ExportContext,
): Promise<void> {
  const { adkContext, ctx } = context;
  const rootExists = await AdkPackage.exists(effectiveRootPackage, adkContext);
  if (rootExists) return;

  ctx.logger.error(
    `❌ Root package ${effectiveRootPackage} does not exist on SAP.`,
  );
  ctx.logger.info(
    '   Create it first in ADT/Eclipse, or use -p with an existing package.',
  );
  process.exit(1);
}

/** Shared state produced by collectExportObjects. */
interface ExportRuntime {
  client: ExportClient;
  adkContext: AdkContext;
  objectSet: AdkObjectSet;
}

/**
 * Load the format plugin, scan the file tree and collect the export
 * objects into an AdkObjectSet (applying the optional type filter).
 * Returns `null` when nothing survives filtering.
 */
async function collectExportObjects(
  fileTree: ReturnType<typeof createFileTree>,
  options: ExportCliOptions,
  result: ExportResult,
  ctx: CliContext,
): Promise<ExportRuntime | null> {
  // Parse object types filter
  const objectTypes = options.types
    ? options.types.split(',').map((t) => t.trim().toUpperCase())
    : undefined;

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
              objectTypes.includes(objType) || objectTypes.includes(objPrefix);
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
    return null;
  }

  return { client, adkContext, objectSet };
}

type DeployOutcome = Awaited<ReturnType<AdkObjectSet['deploy']>>;

/** Map deploy save results onto the export result and log unchanged objects. */
function mapSaveResults(
  save: DeployOutcome['save'],
  result: ExportResult,
  ctx: CliContext,
): void {
  result.saved = save.success;
  result.failed = save.failed;

  for (const r of save.results) {
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
  if (save.unchanged > 0) {
    const unchangedNames = save.results
      .filter((r) => r.unchanged)
      .map((r) => r.object.name);
    ctx.logger.info(
      `\n⏭️ ${save.unchanged} unchanged: ${unchangedNames.join(', ')}`,
    );
  }
}

/** Map activation results onto the export result. */
function mapActivationResults(
  activation: NonNullable<DeployOutcome['activation']>,
  result: ExportResult,
  ctx: CliContext,
): void {
  result.activated = activation.success;

  if (activation.success > 0) {
    ctx.logger.info(`\n✅ ${activation.success} objects activated`);
  }
  if (activation.failed > 0) {
    ctx.logger.warn(`⚠️ ${activation.failed} objects failed activation`);
    for (const msg of activation.messages) {
      ctx.logger.warn(`   ${msg}`);
    }
  }
}

/** Deploy the object set (or dry-run) and map the results. */
async function deployAndMapResults(
  objectSet: AdkObjectSet,
  options: ExportCliOptions,
  result: ExportResult,
  ctx: CliContext,
): Promise<void> {
  if (options.dryRun) {
    // Dry run - just mark as would-be-saved
    for (const obj of objectSet) {
      result.objects.push({
        type: obj.type,
        name: obj.name,
        status: 'saved', // Would be saved
      });
    }
    result.saved = objectSet.size;
    ctx.logger.info(`\n🔍 Dry run: ${objectSet.size} objects would be saved`);
    return;
  }

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
        ctx.logger.info(`   💾 [${saved}/${total}] ${obj.kind} ${obj.name}`);
      }
    },
  });

  // Map save results
  mapSaveResults(deployResult.save, result, ctx);

  // Map activation results
  if (deployResult.activation) {
    mapActivationResults(deployResult.activation, result, ctx);
  }
  // Note: deploy() handles unlockAll() automatically
}

/**
 * Resolve source/files, run the early PREFIX check and build the
 * (filtered) export file tree.
 */
async function prepareExportFiles(
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<{ fileTree: ReturnType<typeof createFileTree> }> {
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
  await checkPrefixFolderLogic(sourcePath, options, ctx);

  ctx.logger.info('🚀 Starting export...');
  ctx.logger.info(`📁 Source: ${sourcePath}`);
  ctx.logger.info(`🎯 Format: ${options.format}`);
  if (specificFiles) ctx.logger.info(`📄 Files: ${specificFiles.join(', ')}`);
  if (options.transport) ctx.logger.info(`🚚 Transport: ${options.transport}`);
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

  return { fileTree };
}

/** Run every pre-deploy step (root check, packages, cleanup, unlocks). */
async function runPreDeploySteps(
  runtime: ExportRuntime,
  effectiveRootPackage: string | undefined,
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<void> {
  const { objectSet } = runtime;
  const context: ExportContext = {
    client: runtime.client,
    adkContext: runtime.adkContext,
    ctx,
  };

  // ============================================
  // Pre-deploy: validate root package exists on SAP
  // ============================================
  if (effectiveRootPackage && !options.dryRun) {
    await ensureRootPackageExists(effectiveRootPackage, context);

    // ============================================
    // Pre-deploy: ensure subpackages exist
    // ============================================
    await ensureSubpackages(objectSet, effectiveRootPackage, context, options);

    // ============================================
    // Pre-deploy: remove objects targeting unavailable packages
    // ============================================
    await skipObjectsInUnavailablePackages(
      objectSet,
      effectiveRootPackage,
      context,
    );

    // ============================================
    // Pre-deploy: delete objects in wrong package
    // ============================================
    await deleteObjectsInWrongPackage(objectSet, options, ctx);
  }

  // ============================================
  // Pre-deploy: recover persisted object locks (--unlock)
  // ============================================
  if (options.unlock && !options.dryRun) {
    await recoverPersistedLocks(objectSet, context);
  }
}

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
        'Release locks with handles persisted by this CLI before saving',
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
    const options = args as ExportCliOptions;

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

    // Resolve source path, run early checks and build the file tree
    const { fileTree } = await prepareExportFiles(options, ctx);

    const result: ExportResult = {
      discovered: 0,
      saved: 0,
      activated: 0,
      skipped: 0,
      failed: 0,
      objects: [],
    };

    try {
      const runtime = await collectExportObjects(
        fileTree,
        options,
        result,
        ctx,
      );
      if (!runtime) {
        displayExportResults(result, ctx.logger);
        return;
      }
      const { objectSet } = runtime;

      // Derive effective root package: either explicit --package or
      // resolved from objects that already have packageRef (e.g., from .abapgit.xml).
      const effectiveRootPackage = resolveEffectiveRootPackage(
        objectSet,
        options,
        ctx,
      );

      // ============================================
      // Pre-deploy steps
      // ============================================
      await runPreDeploySteps(runtime, effectiveRootPackage, options, ctx);

      // ============================================
      // Deploy using AdkObjectSet (save + activate)
      // ============================================
      await deployAndMapResults(objectSet, options, result, ctx);

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
