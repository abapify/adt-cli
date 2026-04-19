/**
 * `adt checkin <directory>` — push a local abapGit/gCTS-formatted directory
 * into SAP (the inverse of `adt checkout`).
 *
 * Thin commander wrapper — all orchestration lives in `CheckinService`.
 */
import { Command } from 'commander';
import { CheckinService } from '../services/checkin';
import { getAdtClientV2 } from '../utils/adt-client-v2';

export const checkinCommand = new Command('checkin')
  .description(
    'Push a local abapGit/gCTS-formatted directory into SAP (inverse of checkout)',
  )
  .argument('<directory>', 'Source directory containing serialised files')
  .option(
    '--format <format>',
    "Format plugin id (default 'abapgit'; try 'gcts' for AFF layout)",
    'abapgit',
  )
  .option('-p, --package <package>', 'Target root SAP package for the checkin')
  .option(
    '-t, --transport <transport>',
    'Transport request to use for lock/save operations',
  )
  .option(
    '--types <types>',
    'Filter by object types (comma-separated, e.g. CLAS,INTF)',
  )
  .option('--dry-run', 'Validate & plan only — no writes to SAP', false)
  .option(
    '--no-activate',
    'Skip activation after save (objects remain inactive)',
  )
  .option(
    '--unlock',
    'Force-unlock objects already locked by the current user before applying',
    false,
  )
  .option(
    '--abap-language-version <version>',
    "ABAP language version for new objects (e.g. '5' for Cloud)",
  )
  .option('--json', 'Emit the CheckinResult as JSON (machine-readable)', false)
  .action(async (directory, options) => {
    try {
      // Ensure auth + ADK bootstrap.
      await getAdtClientV2();

      const service = new CheckinService();
      const types = options.types
        ? options.types
            .split(',')
            .map((t: string) => t.trim().toUpperCase())
            .filter(Boolean)
        : undefined;

      if (!options.json) {
        console.log(`🚀 Checkin: ${directory}`);
        console.log(`📦 Format: ${options.format}`);
        if (options.package) console.log(`📁 Root package: ${options.package}`);
        if (options.transport)
          console.log(`🚚 Transport: ${options.transport}`);
        if (options.dryRun) console.log(`🔍 Dry run (no SAP writes)`);
      }

      const result = await service.checkin({
        sourceDir: directory,
        format: options.format,
        rootPackage: options.package,
        transport: options.transport,
        objectTypes: types,
        dryRun: options.dryRun,
        activate: options.activate,
        unlock: options.unlock,
        abapLanguageVersion: options.abapLanguageVersion,
        onLog: (_level, msg) => {
          if (!options.json) console.log(`   ${msg}`);
        },
        onObject: (obj, status) => {
          if (!options.json)
            console.log(`      • ${obj.type} ${obj.name} (${status})`);
        },
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n📊 ${result.summary}`);
        if (result.aborted) {
          console.error(
            '⚠️  Checkin aborted before completing all tiers — inspect errors above.',
          );
          process.exit(1);
        }
        if (result.apply.totals.failed > 0) {
          process.exit(1);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Checkin failed: ${msg}`);
      process.exit(1);
    }
  });
