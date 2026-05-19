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

/**
 * Parse a comma-separated option string into an array of trimmed strings.
 * Returns a single string when only one value is present (for API compatibility).
 * Returns undefined when the input is falsy.
 */
function parseCommaSeparated(
  value: string | undefined,
  upperCase = false,
): string | string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(',')
    .map((s) => (upperCase ? s.trim().toUpperCase() : s.trim()))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : parts;
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
  .option(
    '--apply-deletions',
    'Remove local files for objects marked with obj_func=D (default: on)',
    true,
  )
  .option(
    '--no-apply-deletions',
    'Disable the deletion pass (backward-compatible mode)',
  )
  .option(
    '--deletion-obj-func <func>',
    'Object function code(s) that trigger the deletion pass (comma-separated). Default: D',
    'D',
  )
  .option(
    '--deletion-pgmid <pgmid>',
    'Program ID filter for deletion objects (comma-separated). Default: R3TR',
    'R3TR',
  )
  .option(
    '--also-transport <numbers>',
    'Additional transport number(s) to merge (comma-separated)',
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

      // Parse comma-separated deletion filters
      const deletionObjFunc = parseCommaSeparated(options.deletionObjFunc);
      const deletionPgmid = parseCommaSeparated(options.deletionPgmid);
      const alsoTransports = options.alsoTransport
        ? (parseCommaSeparated(options.alsoTransport, true) as
            | string
            | string[]
            | undefined)
        : undefined;

      const result = await importService.importTransport({
        transportNumber,
        outputPath,
        objectTypes,
        format: options.format,
        formatOptions,
        debug: options.debug,
        applyDeletions: options.applyDeletions,
        deletionObjFunc,
        deletionPgmid,
        alsoTransports: Array.isArray(alsoTransports)
          ? alsoTransports
          : alsoTransports
            ? [alsoTransports]
            : undefined,
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
