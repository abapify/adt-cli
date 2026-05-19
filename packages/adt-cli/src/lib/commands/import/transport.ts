import { Command } from 'commander';
import { ImportService } from '../../services/import/service';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import {
  handleImportError,
  displayImportResults,
  parseTransportNumbers,
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
  .argument(
    '<transports>',
    'Transport request number(s) to import (comma-separated for multiple: DEVK900001,DEVK900002)',
  )
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
  .option(
    '--apply-deletions',
    'Remove local files for objects marked with obj_func=D and pgmid=R3TR (default: on)',
    true,
  )
  .option(
    '--no-apply-deletions',
    'Disable the deletion pass (backward-compatible mode)',
  )
  .option(
    '--save-tr-metadata',
    'Write a JSON sidecar for each transport to <outputDir>/.adt/tr/<TRKORR>.json',
    false,
  )
  .option(
    '--remove-missing-objects',
    'Remove local files for objects that are in the TR but cannot be fetched from SAP (orphan sync)',
    false,
  )
  .option('--debug', 'Enable debug output', false)
  .action(async (transports, targetFolder, options) => {
    try {
      // Initialize ADT client (also initializes ADK)
      await getAdtClientV2();

      const importService = new ImportService();

      // Parse comma-separated transport numbers; use the first as primary for defaults
      const transportNumbers = parseTransportNumbers(transports);
      const primaryTransport = transportNumbers[0];

      // Determine output path: --output option, targetFolder argument, or default
      const outputPath =
        options.output ||
        targetFolder ||
        `./${options.format}-${primaryTransport.toLowerCase()}`;

      // Show start message
      console.log(`🚀 Starting import of transport: ${transports}`);
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
        transportNumber: transports,
        outputPath,
        objectTypes,
        format: options.format,
        formatOptions,
        debug: options.debug,
        applyDeletions: options.applyDeletions,
        saveTrMetadata: options.saveTrMetadata,
        removeMissingObjects: options.removeMissingObjects,
      });

      displayImportResults(
        result,
        'Transport',
        result.transportNumber ?? primaryTransport,
      );
    } catch (error) {
      handleImportError(error, options.debug);
    }
  });
