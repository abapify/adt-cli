/**
 * adt package create <name> <description> - Create a new ABAP package
 *
 * Usage:
 *   adt package create ZMYPKG "My Package"
 *   adt package create ZMYPKG "My Package" --super-package ZPARENT
 *   adt package create ZMYPKG "My Package" --transport DEVK900001
 *   adt package create ZMYPKG "My Package" --no-error-existing
 */

import { Command } from 'commander';
import { getAdtClientV2, getCliContext } from '../../utils/adt-client-v2';
import { createProgressReporter } from '../../utils/progress-reporter';
import { createCliLogger } from '../../utils/logger-config';
import { AdkPackage } from '@abapify/adk';

export const packageCreateCommand = new Command('create')
  .description('Create a new ABAP package')
  .argument('<name>', 'Package name (e.g., ZMYPKG)')
  .argument('<description>', 'Package description')
  .option('-s, --super-package <pkg>', 'Parent (super) package name')
  .option('-t, --transport <corrnr>', 'Transport request number')
  .option('--no-error-existing', 'Do not error if package already exists')
  .option('--json', 'Output result as JSON')
  .action(async function (
    this: Command,
    name: string,
    description: string,
    options: {
      superPackage?: string;
      transport?: string;
      errorExisting: boolean;
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

      // Check if already exists (when --no-error-existing is set)
      if (!options.errorExisting) {
        progress.step(`🔍 Checking if ${pkgName} already exists...`);
        const exists = await AdkPackage.exists(pkgName);
        progress.done();
        if (exists) {
          if (options.json) {
            console.log(
              JSON.stringify(
                { package: pkgName, status: 'already_exists' },
                null,
                2,
              ),
            );
          } else {
            console.log(`ℹ️  Package ${pkgName} already exists — skipping`);
          }
          return;
        }
      }

      progress.step(`📦 Creating package ${pkgName}...`);

      const pkg = await AdkPackage.create(
        pkgName,
        {
          description,
          ...(options.superPackage
            ? {
                superPackage: {
                  name: options.superPackage.toUpperCase(),
                  uri: `/sap/bc/adt/packages/${encodeURIComponent(options.superPackage.toUpperCase())}`,
                  type: 'DEVC/K',
                },
              }
            : {}),
        },
        { transport: options.transport },
      );

      progress.done();

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              package: pkg.name,
              description: pkg.description,
              status: 'created',
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`✅ Package ${pkg.name} created successfully`);
        console.log(`   Description: ${pkg.description}`);
        if (options.superPackage) {
          console.log(
            `   Super package: ${options.superPackage.toUpperCase()}`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done(`❌ Create failed: ${message}`);
      console.error('❌ Create failed:', message);
      process.exit(1);
    }
  });
