/**
 * adt package delete <name> - Delete an ABAP package
 *
 * Usage:
 *   adt package delete ZMYPKG
 *   adt package delete ZMYPKG --transport DEVK900001
 *   adt package delete ZMYPKG -y
 */

import { Command } from 'commander';
import { confirm } from '@inquirer/prompts';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { AdkPackage } from '@abapify/adk';

export const packageDeleteCommand = new Command('delete')
  .description('Delete an ABAP package')
  .argument('<name>', 'Package name (e.g., ZMYPKG)')
  .option('-t, --transport <corrnr>', 'Transport request number')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output result as JSON')
  .action(async function (
    this: Command,
    name: string,
    options: { transport?: string; yes: boolean; json: boolean },
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

      // Get package info first
      progress.step(`🔍 Getting package ${pkgName}...`);
      let pkg: AdkPackage;
      try {
        pkg = await AdkPackage.get(pkgName);
      } catch {
        console.error(`❌ Package ${pkgName} not found`);
        process.exit(1);
      }
      progress.done();

      if (!options.json) {
        console.log(`\n⚠️  About to delete package: ${pkg.name}`);
        console.log(`   Description: ${pkg.description || '-'}`);
      }

      if (!options.yes && !options.json) {
        const confirmed = await confirm({
          message: `Delete package ${pkgName}?`,
          default: false,
        });
        if (!confirmed) {
          console.log('❌ Deletion cancelled');
          process.exit(0);
        }
      }

      progress.step(`🗑️  Deleting package ${pkgName}...`);

      await AdkPackage.delete(pkgName, { transport: options.transport });

      progress.done();

      if (options.json) {
        console.log(
          JSON.stringify({ package: pkgName, status: 'deleted' }, null, 2),
        );
      } else {
        console.log(`✅ Package ${pkgName} deleted successfully`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Delete failed: ${message}`);
      console.error('❌ Delete failed:', message);
      process.exit(1);
    }
  });
