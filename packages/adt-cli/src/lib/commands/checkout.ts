/**
 * adt checkout - Download ABAP objects to abapgit-compatible local files
 *
 * Mirrors sapcli's `checkout` command. Creates abapgit-compatible local files
 * from SAP repository objects.
 *
 * Usage:
 *   adt checkout class ZCL_MY_CLASS ./src
 *   adt checkout interface ZIF_MY_INTF ./src
 *   adt checkout program ZMYPROGRAM ./src
 *   adt checkout package $ZMYPKG ./src
 *   adt checkout package $ZMYPKG ./src --object-types CLAS,INTF
 *
 * This is a convenience alias for `adt import object` / `adt import package`.
 */

import { Command } from 'commander';
import { ImportService } from '../services/import/service';
import { IconRegistry } from '../utils/icon-registry';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import {
  handleImportError,
  displayImportResults,
} from '../utils/command-helpers';

const OBJECT_TYPE_ALIASES: Record<string, string> = {
  class: 'CLAS',
  clas: 'CLAS',
  interface: 'INTF',
  intf: 'INTF',
  program: 'PROG',
  prog: 'PROG',
  domain: 'DOMA',
  doma: 'DOMA',
  dataelement: 'DTEL',
  dtel: 'DTEL',
  table: 'TABL',
  tabl: 'TABL',
  structure: 'TABL',
  functiongroup: 'FUGR',
  fugr: 'FUGR',
  ddl: 'DDLS',
  ddls: 'DDLS',
  dcl: 'DCLS',
  dcls: 'DCLS',
  package: 'DEVC',
  devc: 'DEVC',
};

function createObjectTypeSubcommand(typeName: string): Command {
  const upper =
    OBJECT_TYPE_ALIASES[typeName.toLowerCase()] ?? typeName.toUpperCase();

  return new Command(typeName)
    .description(`Download ${typeName} to abapgit-compatible local files`)
    .argument('<name>', `${typeName} name`)
    .argument('[targetFolder]', 'Target output folder', '.')
    .option('-o, --output <path>', 'Output directory (overrides targetFolder)')
    .option('--format <format>', 'Output format (default: abapgit)', 'abapgit')
    .option('--debug', 'Enable debug output', false)
    .action(
      async (
        name: string,
        targetFolder: string,
        options: { output?: string; format: string; debug: boolean },
      ) => {
        try {
          await getAdtClientV2();

          const importService = new ImportService();
          const outputPath = options.output || targetFolder || './src';

          console.log(`🔍 Downloading ${upper} ${name.toUpperCase()}...`);

          const result = await importService.importObject({
            objectName: name.toUpperCase(),
            outputPath,
            format: options.format,
            debug: options.debug,
          });

          if (result.results.success > 0) {
            const icon = IconRegistry.getIcon(result.objectType || upper);
            console.log(
              `\n${icon} ${result.objectType || upper} ${result.objectName}: downloaded`,
            );
            console.log(`✨ Files written to: ${result.outputPath}`);
          } else {
            console.error(
              `❌ Failed to download ${upper} ${name.toUpperCase()}`,
            );
            process.exit(1);
          }
        } catch (error) {
          handleImportError(error, options.debug);
        }
      },
    );
}

function createPackageSubcommand(): Command {
  return new Command('package')
    .description(
      'Download a package and its contents to abapgit-compatible local files',
    )
    .argument('<packageName>', 'ABAP package name')
    .argument('[targetFolder]', 'Target output folder', '.')
    .option('-o, --output <path>', 'Output directory (overrides targetFolder)')
    .option(
      '-t, --object-types <types>',
      'Comma-separated object types (e.g., CLAS,INTF,DDLS)',
    )
    .option('--no-sub-packages', 'Exclude subpackages')
    .option('--format <format>', 'Output format (default: abapgit)', 'abapgit')
    .option('--debug', 'Enable debug output', false)
    .action(
      async (
        packageName: string,
        targetFolder: string,
        options: {
          output?: string;
          objectTypes?: string;
          subPackages: boolean;
          format: string;
          debug: boolean;
        },
      ) => {
        try {
          await getAdtClientV2();

          const importService = new ImportService();
          const outputPath = options.output || targetFolder || './src';
          const objectTypes = options.objectTypes
            ? options.objectTypes
                .split(',')
                .map((t: string) => t.trim().toUpperCase())
            : undefined;

          console.log(`🚀 Downloading package: ${packageName.toUpperCase()}`);
          console.log(`📁 Target folder: ${outputPath}`);

          const result = await importService.importPackage({
            packageName: packageName.toUpperCase(),
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
      },
    );
}

export function createCheckoutCommand(): Command {
  const cmd = new Command('checkout').description(
    'Download ABAP objects to abapgit-compatible local files',
  );

  // Object type subcommands
  const objectTypes = [
    'class',
    'interface',
    'program',
    'domain',
    'dataelement',
    'table',
    'functiongroup',
    'ddl',
    'dcl',
  ];
  for (const type of objectTypes) {
    cmd.addCommand(createObjectTypeSubcommand(type));
  }

  // Package subcommand
  cmd.addCommand(createPackageSubcommand());

  return cmd;
}
