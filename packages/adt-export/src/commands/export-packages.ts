/**
 * Subpackage preparation for the export command: create missing subpackages,
 * fix wrong super-package references and activate the fixed packages.
 */

import { AdkPackage, type AdkObjectSet } from '@abapify/adk';
import type { ExportCliOptions, ExportContext } from './export-types';

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
export async function ensureSubpackages(
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
