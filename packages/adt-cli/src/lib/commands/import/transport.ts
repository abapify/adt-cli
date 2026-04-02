import { Command } from 'commander';
import { ImportService } from '../../services/import/service';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import {
  handleImportError,
  displayImportResults,
} from '../../utils/command-helpers';

function parseFormatOptionEntries(entries: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const entry of entries) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
      throw new Error(
        `Invalid --format-option '${entry}'. Expected key=value format.`,
      );
    }

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();

    if (!key || !value) {
      throw new Error(
        `Invalid --format-option '${entry}'. Expected key=value format.`,
      );
    }

    parsed[key] = value;
  }

  return parsed;
}

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
    'Output format: abapgit | @abapify/adt-plugin-abapgit',
    'abapgit',
  )
  .option(
    '--format-option <key=value>',
    'Format-specific option (repeatable), e.g. --format-option folderLogic=full',
    (value: string, previous: string[]) => [...previous, value],
    [],
  )
  .option(
    '--folder-logic <logic>',
    '[DEPRECATED] Use --format-option folderLogic=<logic>',
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
      const formatOptions = parseFormatOptionEntries(
        options.formatOption ?? [],
      );

      // Backward compatibility: keep --folder-logic alias while moving to generic format options.
      if (options.folderLogic && !formatOptions.folderLogic) {
        formatOptions.folderLogic = options.folderLogic;
        console.warn(
          '⚠️  --folder-logic is deprecated. Use --format-option folderLogic=<logic> instead.',
        );
      }

      const result = await importService.importTransport({
        transportNumber,
        outputPath,
        objectTypes,
        format: options.format,
        formatOptions,
        debug: options.debug,
      });

      displayImportResults(
        result,
        'Transport',
        result.transportNumber ?? transportNumber,
      );
    } catch (error) {
      handleImportError(error, options.debug);
    }
  });
