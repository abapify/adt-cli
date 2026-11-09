/**
 * adt package list <name> - List objects/subpackages in a package
 *
 * Usage:
 *   adt package list ZMYPKG
 *   adt package list ZMYPKG --recursive
 *   adt package list ZMYPKG --long
 *   adt package list ZMYPKG --subpackages-only
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { asText } from '../../utils/text';
import { AdkPackage } from '@abapify/adk';
import type { AbapObject } from '@abapify/adk';

// Stringify an unknown field safely (avoids "[object Object]").
// JSON.stringify can throw on circular refs / BigInt — fall back to
// plain String coercion so `package list` never crashes on output.
function asStr(v: unknown, fallback = ''): string {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return asText(v);
    }
  }
  return asText(v);
}

// Recursively collect all descendant packages (breadth-first).
async function collectAllSubpackages(pkg: AbapObject): Promise<AbapObject[]> {
  const allSubPkgs: AbapObject[] = [];
  const queue: AbapObject[] = [pkg];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = (await (current as any).getSubpackages()) as AbapObject[];
    allSubPkgs.push(...children);
    queue.push(...children);
  }
  return allSubPkgs;
}

// Print the subpackage list section.
function printSubpackages(subpackages: AbapObject[], long: boolean): void {
  if (subpackages.length === 0) return;
  console.log(chalk.underline(`\n▼ Subpackages (${subpackages.length})`));
  for (const sp of subpackages) {
    const spObj = sp as unknown as Record<string, unknown>;
    if (long) {
      console.log(
        `  ${chalk.cyan(asStr(spObj.name))}  ${chalk.dim(asStr(spObj.description))}`,
      );
    } else {
      console.log(`  ${asStr(spObj.name)}`);
    }
  }
}

// Print the flat object name list (short mode).
function printObjectNames(objects: AbapObject[]): void {
  for (const obj of objects) {
    console.log(`  ${asStr((obj as unknown as Record<string, unknown>).name)}`);
  }
}

// Group objects by type (insertion order preserved).
function groupObjectsByType(objects: AbapObject[]): Map<string, AbapObject[]> {
  const byType = new Map<string, AbapObject[]>();
  for (const obj of objects) {
    const type = asStr((obj as unknown as Record<string, unknown>).type);
    const list = byType.get(type) ?? [];
    list.push(obj);
    byType.set(type, list);
  }
  return byType;
}

// Print one object row in long mode.
function printObjectRow(
  obj: AbapObject,
  opts: { recursive: boolean; pkgName: string },
): void {
  const o = obj as unknown as Record<string, unknown>;
  const objPkg = asStr(o.package);
  const pkgNote =
    opts.recursive && objPkg !== opts.pkgName ? chalk.dim(` [${objPkg}]`) : '';
  console.log(
    `    ${chalk.green(asStr(o.name))}${pkgNote}  ${chalk.dim(asStr(o.description))}`,
  );
}

// Print one type group of the long-mode object list.
function printTypeGroup(
  type: string,
  list: AbapObject[],
  opts: { recursive: boolean; pkgName: string },
): void {
  console.log(chalk.dim(`  ${type} (${list.length})`));
  for (const obj of list) {
    printObjectRow(obj, opts);
  }
}

// Print the object list section, grouped by type in long mode.
function printObjects(
  objects: AbapObject[],
  opts: { long: boolean; recursive: boolean; pkgName: string },
): void {
  console.log(chalk.underline(`\n▼ Objects (${objects.length})`));
  if (!opts.long) {
    printObjectNames(objects);
    return;
  }
  // Group by type
  const byType = groupObjectsByType(objects);
  for (const [type, list] of [...byType.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    printTypeGroup(type, list, opts);
  }
}

// Print the human-readable package listing.
function printPackageListing(
  subpackages: AbapObject[],
  objects: AbapObject[],
  opts: { recursive: boolean; long: boolean; subpackagesOnly: boolean },
  pkgName: string,
): void {
  printSubpackages(subpackages, opts.long);
  if (opts.subpackagesOnly) return;
  if (objects.length > 0) {
    printObjects(objects, {
      long: opts.long,
      recursive: opts.recursive,
      pkgName,
    });
  } else if (subpackages.length === 0) {
    console.log(chalk.dim('  (empty)'));
  }
}

export const packageListCommand = new Command('list')
  .description('List objects and subpackages in an ABAP package')
  .argument('<name>', 'Package name (e.g., ZMYPKG)')
  .option('-r, --recursive', 'Include objects from subpackages recursively')
  .option('-l, --long', 'Long output — include object type and package columns')
  .option('--subpackages-only', 'List only subpackages, not objects')
  .option('--json', 'Output as JSON')
  .action(async function (
    this: Command,
    name: string,
    options: {
      recursive: boolean;
      long: boolean;
      subpackagesOnly: boolean;
      json: boolean;
    },
  ) {
    const globalOpts = this.optsWithGlobals?.() ?? {};
    const ctx = getCliContext();
    const verboseFlag = globalOpts.verbose ?? ctx.verbose ?? false;
    const compact = !verboseFlag;
    const logger =
      (this as any).logger ??
      ctx.logger ??
      createCliLogger({ verbose: verboseFlag });
    const progress = createProgressReporter({ compact, logger });

    const pkgName = name.toUpperCase();

    try {
      await getAdtClientV2();

      progress.step(`🔍 Loading package ${pkgName}...`);
      const pkg = await AdkPackage.get(pkgName);
      progress.done();

      // Load subpackages
      progress.step('📦 Loading subpackages...');
      const subpackages: AbapObject[] = options.recursive
        ? await collectAllSubpackages(pkg)
        : ((await pkg.getSubpackages()) as AbapObject[]);
      progress.done();

      // Load objects (if not --subpackages-only)
      let objects: AbapObject[] = [];
      if (!options.subpackagesOnly) {
        progress.step('📄 Loading objects...');
        objects = options.recursive
          ? await pkg.getAllObjects()
          : await pkg.getObjects();
        progress.done();
      }

      if (options.json) {
        console.log(JSON.stringify({ subpackages, objects }, null, 2));
        return;
      }

      printPackageListing(subpackages, objects, options, pkgName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ List failed:', message);
      process.exit(1);
    }
  });
