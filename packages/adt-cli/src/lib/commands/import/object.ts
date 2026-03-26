import { Command } from 'commander';
import { ImportService } from '../../services/import/service';
import { IconRegistry } from '../../utils/icon-registry';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

export const importObjectCommand = new Command('object')
  .argument(
    '<objectName>',
    'ABAP object name to import (e.g., ZAGE_DOMA_CASE_SENSITIVE)',
  )
  .argument('[targetFolder]', 'Target folder for output')
  .description(
    'Import a single ABAP object by name (searches, resolves type, and creates local file)',
  )
  .option(
    '-o, --output <path>',
    'Output directory (overrides targetFolder)',
    '',
  )
  .option(
    '--format <format>',
    'Output format: abapgit | @abapify/adt-plugin-abapgit',
    'abapgit',
  )
  .option(
    '--format-option <key=value>',
    'Format-specific option (repeatable), e.g. --format-option folderLogic=full',
    (value: string, previous: string[]) => [...previous, value],
    [],
  )
  .option('--debug', 'Enable debug output', false)
  .action(async (objectName, targetFolder, options) => {
    try {
      // Initialize ADT client (also initializes ADK)
      await getAdtClientV2();

      const importService = new ImportService();

      // Determine output path: --output option, targetFolder argument, or cwd
      const outputPath = options.output || targetFolder || './src';

      console.log(`🔍 Searching for object: ${objectName}`);

      // Parse format options
      const formatOptions: Record<string, string> = {};
      for (const entry of options.formatOption ?? []) {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
          throw new Error(
            `Invalid --format-option '${entry}'. Expected key=value format.`,
          );
        }
        formatOptions[entry.slice(0, separatorIndex).trim()] = entry
          .slice(separatorIndex + 1)
          .trim();
      }

      const result = await importService.importObject({
        objectName,
        outputPath,
        format: options.format,
        formatOptions,
        debug: options.debug,
      });

      // Display results
      if (result.results.success > 0) {
        const icon = IconRegistry.getIcon(result.objectType || '');
        console.log(
          `\n${icon} ${result.objectType} ${result.objectName}: imported`,
        );
        console.log(`✨ Files written to: ${result.outputPath}`);
      } else {
        console.log(`\n❌ Failed to import ${objectName}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${msg}`);
      if (options.debug && error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });
