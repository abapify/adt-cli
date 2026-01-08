import { Command } from 'commander';
import { ImportService } from '../../services/import/service';
import { IconRegistry } from '../../utils/icon-registry';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

export const importTransportCommand = new Command('transport')
  .argument('<transportNumber>', 'Transport request number to import')
  .argument('[targetFolder]', 'Target folder for output')
  .description('Import a transport request and its objects')
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
    '--format <format>',
    'Output format: abapgit | oat | @abapify/abapgit | @abapify/oat',
    'abapgit',
  )
  .option('--debug', 'Enable debug output', false)
  .action(async (transportNumber, targetFolder, options) => {
    try {
      // Initialize ADT client (also initializes ADK)
      await getAdtClientV2();

      const importService = new ImportService();

      // Determine output path: --output option, targetFolder argument, or default
      const outputPath =
        options.output ||
        targetFolder ||
        `./${options.format}-${transportNumber.toLowerCase()}`;

      // Show start message
      console.log(`🚀 Starting import of transport: ${transportNumber}`);
      console.log(`📁 Target folder: ${outputPath}`);

      // Parse object types if provided
      const objectTypes = options.objectTypes
        ? options.objectTypes
            .split(',')
            .map((t: string) => t.trim().toUpperCase())
        : undefined;

      const result = await importService.importTransport({
        transportNumber,
        outputPath,
        objectTypes,
        format: options.format,
        debug: options.debug,
      });

      // Display results
      console.log(`\n✅ Transport import complete!`);
      console.log(`📦 Transport: ${result.transportNumber}`);
      console.log(`📝 Description: ${result.description}`);
      console.log(
        `📊 Results: ${result.results.success} success, ${result.results.skipped} skipped, ${result.results.failed} failed`,
      );

      // Show object type breakdown
      if (Object.keys(result.objectsByType).length > 0) {
        console.log(`\n📋 Objects by type:`);
        for (const [type, count] of Object.entries(result.objectsByType)) {
          const icon = IconRegistry.getIcon(type);
          console.log(`   ${icon} ${type}: ${count}`);
        }
      }

      console.log(`\n✨ Files written to: ${result.outputPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof Error && 'code' in error
          ? (error as any).code
          : 'UNKNOWN';
      const errorStatus =
        error instanceof Error && 'status' in error
          ? (error as any).status
          : '';

      console.error(`❌ Import failed: ${errorMsg}`);
      if (errorCode && errorCode !== 'UNKNOWN') {
        console.error(`   Error code: ${errorCode}`);
      }
      if (errorStatus) {
        console.error(`   HTTP status: ${errorStatus}`);
      }
      if (error instanceof Error && error.stack) {
        console.error(`   Details: ${error.stack}`);
      }
      process.exit(1);
    }
  });
