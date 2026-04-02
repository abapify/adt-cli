import { Command } from 'commander';
import { ImportService } from '../../services/import/service';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import {
  handleImportError,
  displayImportResults,
} from '../../utils/command-helpers';

export const importPackageCommand = new Command('package')
  .argument('<packageName>', 'ABAP package name to import')
  .argument('[targetFolder]', 'Target folder for output')
  .description('Import an ABAP package and its contents')
  .option(
    '-o, --output <path>',
    'Output directory (overrides targetFolder)',
    '',
  )
  .option(
    '-t, --object-types <types>',
    'Comma-separated object types (e.g., CLAS,INTF,DDLS). Default: all supported by format',
  )
  .option(
    '--no-sub-packages',
    'Exclude subpackages (by default subpackages are included)',
  )
  .option(
    '--format <format>',
    'Output format: abapgit | @abapify/adt-plugin-abapgit',
    'abapgit',
  )
  .option('--debug', 'Enable debug output', false)
  .action(async (packageName, targetFolder, options) => {
    try {
      // Initialize ADT client (also initializes ADK)
      await getAdtClientV2();

      const importService = new ImportService();

      // Determine output path: --output option, targetFolder argument, or default
      const outputPath = options.output || targetFolder || `./src`;

      // Show start message
      console.log(`🚀 Starting import of package: ${packageName}`);
      console.log(`📁 Target folder: ${outputPath}`);

      // Parse object types if provided
      const objectTypes = options.objectTypes
        ? options.objectTypes
            .split(',')
            .map((t: string) => t.trim().toUpperCase())
        : undefined;

      const result = await importService.importPackage({
        packageName,
        outputPath,
        objectTypes,
        includeSubpackages: options.subPackages,
        format: options.format,
        debug: options.debug,
      });

      displayImportResults(
        result,
        'Package',
        result.packageName ?? packageName,
      );
    } catch (error) {
      handleImportError(error, options.debug);
    }
  });
