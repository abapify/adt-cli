/**
 * adt package activate <name...> - Activate one or more ABAP packages
 *
 * Usage:
 *   adt package activate ZMYPKG
 *   adt package activate ZPKG1 ZPKG2 ZPKG3
 *   adt package activate ZMYPKG --json
 */

import { Command } from 'commander';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { AdkPackage } from '@abapify/adk';

export const packageActivateCommand = new Command('activate')
  .description('Activate one or more ABAP packages')
  .argument('<names...>', 'Package name(s) to activate')
  .option('--json', 'Output result as JSON')
  .action(async function (
    this: Command,
    names: string[],
    options: { json: boolean },
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

    const pkgNames = names.map((n) => n.toUpperCase());
    const results: Array<{ package: string; status: string; error?: string }> =
      [];

    try {
      await getAdtClientV2();

      for (const pkgName of pkgNames) {
        progress.step(`⚡ Activating ${pkgName}...`);
        try {
          const pkg = await AdkPackage.get(pkgName);
          await pkg.activate();
          progress.done();
          results.push({ package: pkgName, status: 'activated' });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          progress.done(`❌ ${pkgName}: ${message}`);
          results.push({ package: pkgName, status: 'failed', error: message });
        }
      }

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        const ok = results.filter((r) => r.status === 'activated');
        const failed = results.filter((r) => r.status === 'failed');
        if (ok.length > 0) {
          console.log(`✅ Activated: ${ok.map((r) => r.package).join(', ')}`);
        }
        if (failed.length > 0) {
          for (const r of failed) {
            console.error(`❌ ${r.package}: ${r.error}`);
          }
          process.exit(1);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Activate failed: ${message}`);
      console.error('❌ Activate failed:', message);
      process.exit(1);
    }
  });
