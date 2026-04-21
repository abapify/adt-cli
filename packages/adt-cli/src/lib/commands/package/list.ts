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
import { AdkPackage } from '@abapify/adk';
import type { AbapObject } from '@abapify/adk';

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
      let subpackages: AbapObject[] = [];
      progress.step('📦 Loading subpackages...');
      if (options.recursive) {
        // Recursively collect all descendant packages
        const allSubPkgs: AbapObject[] = [];
        const queue = [pkg];
        while (queue.length > 0) {
          const current = queue.shift()!;
          const children = (await current.getSubpackages()) as AbapObject[];
          allSubPkgs.push(...children);
          for (const child of children) {
            queue.push(child as typeof pkg);
          }
        }
        subpackages = allSubPkgs;
      } else {
        subpackages = (await pkg.getSubpackages()) as AbapObject[];
      }
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

      // Stringify an unknown field safely (avoids "[object Object]").
      // JSON.stringify can throw on circular refs / BigInt — fall back to
      // plain String coercion so `package list` never crashes on output.
      const asStr = (v: unknown, fallback = ''): string => {
        if (v === undefined || v === null) return fallback;
        if (typeof v === 'object') {
          try {
            return JSON.stringify(v);
          } catch {
            return String(v);
          }
        }
        return String(v);
      };

      // Display subpackages
      if (subpackages.length > 0) {
        console.log(chalk.underline(`\n▼ Subpackages (${subpackages.length})`));
        for (const sp of subpackages) {
          const spObj = sp as unknown as Record<string, unknown>;
          if (options.long) {
            console.log(
              `  ${chalk.cyan(asStr(spObj.name))}  ${chalk.dim(asStr(spObj.description))}`,
            );
          } else {
            console.log(`  ${asStr(spObj.name)}`);
          }
        }
      }

      // Display objects
      if (!options.subpackagesOnly) {
        if (objects.length > 0) {
          console.log(chalk.underline(`\n▼ Objects (${objects.length})`));

          if (options.long) {
            // Group by type
            const byType = new Map<string, AbapObject[]>();
            for (const obj of objects) {
              const type = asStr(
                (obj as unknown as Record<string, unknown>).type,
              );
              const list = byType.get(type) ?? [];
              list.push(obj);
              byType.set(type, list);
            }
            for (const [type, list] of [...byType.entries()].sort((a, b) =>
              a[0].localeCompare(b[0]),
            )) {
              console.log(chalk.dim(`  ${type} (${list.length})`));
              for (const obj of list) {
                const o = obj as unknown as Record<string, unknown>;
                const objPkg = asStr(o.package);
                const pkgNote =
                  options.recursive && objPkg !== pkgName
                    ? chalk.dim(` [${objPkg}]`)
                    : '';
                console.log(
                  `    ${chalk.green(asStr(o.name))}${pkgNote}  ${chalk.dim(asStr(o.description))}`,
                );
              }
            }
          } else {
            for (const obj of objects) {
              console.log(
                `  ${asStr((obj as unknown as Record<string, unknown>).name)}`,
              );
            }
          }
        } else if (subpackages.length === 0) {
          console.log(chalk.dim('  (empty)'));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ List failed:', message);
      process.exit(1);
    }
  });
