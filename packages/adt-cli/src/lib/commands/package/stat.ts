/**
 * adt package stat <name> - Check if an ABAP package exists
 *
 * Exit codes:
 *   0  - Package found
 *   10 - Package not found
 *   1  - Error (network, auth, etc.)
 *
 * Usage:
 *   adt package stat ZMYPKG
 *   adt package stat ZMYPKG --json
 *   adt package stat ZMYPKG && echo "exists" || echo "missing"
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { AdkPackage } from '@abapify/adk';

export const packageStatCommand = new Command('stat')
  .description('Check if an ABAP package exists (exit 0=found, 10=not found)')
  .argument('<name>', 'Package name to check')
  .option('--json', 'Output result as JSON')
  .action(async (_name: string, options: { json: boolean }) => {
    // Note: logger not used for stat — output is kept minimal for scripting

    const pkgName = _name.toUpperCase();

    try {
      await getAdtClientV2();

      const exists = await AdkPackage.exists(pkgName);

      if (options.json) {
        console.log(JSON.stringify({ package: pkgName, exists }, null, 2));
      } else {
        if (exists) {
          console.log(`✅ Package ${pkgName} exists`);
        } else {
          console.log(`❌ Package ${pkgName} not found`);
        }
      }

      process.exit(exists ? 0 : 10);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Stat failed:', message);
      process.exit(1);
    }
  });
