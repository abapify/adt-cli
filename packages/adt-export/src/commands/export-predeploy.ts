/**
 * Pre-deploy steps for the export command: root-package validation,
 * subpackage preparation, cleanup of skipped/misplaced objects and
 * persisted-lock recovery.
 */

import { AdkPackage, type AdkObject, type AdkObjectSet } from '@abapify/adk';
import type { CliContext } from '@abapify/adt-plugin';
import { getTargetPackageName, type ExportRuntime } from './export-collect';
import { ensureSubpackages } from './export-packages';
import type { ExportCliOptions, ExportContext } from './export-types';

/** Group objects by their target subpackage (root-package objects excluded). */
function groupObjectsByPackage(
  objectSet: AdkObjectSet,
  effectiveRootPackage: string,
): Map<string, unknown[]> {
  const objectsByPkg = new Map<string, unknown[]>();
  for (const obj of objectSet) {
    const pkgName = getTargetPackageName(obj);
    if (pkgName && pkgName !== effectiveRootPackage) {
      if (!objectsByPkg.has(pkgName)) objectsByPkg.set(pkgName, []);
      objectsByPkg.get(pkgName)!.push(obj);
    }
  }
  return objectsByPkg;
}

/** Name of an object's parent (function group or container), upper-cased. */
function getParentName(obj: AdkObject): string | undefined {
  const groupName = (obj as any).groupName as string | undefined;
  const containerName = (
    (obj as any)._data?.containerRef?.name as string | undefined
  )?.toUpperCase();
  return groupName?.toUpperCase() ?? containerName;
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
    const parentName = getParentName(obj);
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

/** Sub-packages that do not exist on the SAP system. */
async function findUnavailablePackages(
  objectsByPkg: Map<string, unknown[]>,
  context: ExportContext,
): Promise<Set<string>> {
  const { adkContext } = context;
  const unavailablePackages = new Set<string>();
  for (const [pkgName] of objectsByPkg) {
    const exists = await AdkPackage.exists(pkgName, adkContext);
    if (!exists) {
      unavailablePackages.add(pkgName);
    }
  }
  return unavailablePackages;
}

/** Remove objects targeting any of the given packages. */
function removeObjectsTargetingPackages(
  objectSet: AdkObjectSet,
  packages: Set<string>,
): { removedObjects: string[]; removedNames: Set<string> } {
  const removedObjects: string[] = [];
  const removedNames = new Set<string>();
  for (const obj of [...objectSet]) {
    const pkgName = getTargetPackageName(obj);
    if (pkgName && packages.has(pkgName)) {
      objectSet.remove(obj);
      removedObjects.push(`${(obj as any).kind} ${obj.name}`);
      removedNames.add(obj.name.toUpperCase());
    }
  }
  return { removedObjects, removedNames };
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
  const { ctx } = context;
  // Check which sub-packages actually exist on SAP; skip objects
  // targeting unavailable ones to prevent cascade failures.
  const objectsByPkg = groupObjectsByPackage(objectSet, effectiveRootPackage);

  const unavailablePackages = await findUnavailablePackages(
    objectsByPkg,
    context,
  );
  if (unavailablePackages.size === 0) return;

  // Remove objects targeting unavailable packages from the object set
  const { removedObjects, removedNames } = removeObjectsTargetingPackages(
    objectSet,
    unavailablePackages,
  );

  // Also remove child objects whose parent was removed.
  removeChildrenOfRemoved(objectSet, removedNames, removedObjects);

  logSkippedObjects(removedObjects, unavailablePackages, ctx);
}

/** Load the object's current package from SAP, keeping local _data intact. */
async function loadCurrentPackage(obj: AdkObject): Promise<string | undefined> {
  // Save local _data before load() — load() overwrites _data with
  // SAP's current server state, destroying abapGit-sourced fields.
  const localData = (obj as any)._data;

  // Try loading existing object from SAP
  await obj.load();
  const currentPkg = (obj as any).package as string | undefined;

  // Restore the abapGit-sourced data (load was only for package check)
  (obj as any)._data = localData;
  return currentPkg;
}

/** Delete the object and reset its state so deploy recreates it in targetPkg. */
async function deleteAndReset(
  obj: AdkObject,
  targetPkg: string,
  options: ExportCliOptions,
): Promise<boolean> {
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
}

/** Log unexpected pre-deploy check failures (404 / not found is fine). */
function logReassignCheckError(
  obj: AdkObject,
  err: unknown,
  ctx: CliContext,
): void {
  // Object doesn't exist yet (404) or load failed — that's fine,
  // the deploy will create it in the correct package
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes('404') && !msg.includes('not found')) {
    ctx.logger.warn(`   ⚠️ Pre-deploy check for ${obj.name}: ${msg}`);
  }
}

/** Delete one object that sits in the wrong package; true when deleted. */
async function reassignObjectPackage(
  obj: AdkObject,
  options: ExportCliOptions,
  ctx: CliContext,
): Promise<boolean> {
  const targetPkg = getTargetPackageName(obj);
  if (!targetPkg) return false;

  try {
    const currentPkg = await loadCurrentPackage(obj);
    if (!currentPkg || currentPkg === targetPkg) return false;

    // Object exists in wrong package — delete so deploy recreates it
    ctx.logger.info(
      `   📦 ${obj.name}: ${currentPkg} → ${targetPkg} (will delete + recreate)`,
    );

    return await deleteAndReset(obj, targetPkg, options);
  } catch (err) {
    logReassignCheckError(obj, err, ctx);
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

/** Run every pre-deploy step (root check, packages, cleanup, unlocks). */
export async function runPreDeploySteps(
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
