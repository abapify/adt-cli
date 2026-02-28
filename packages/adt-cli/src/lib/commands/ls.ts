/**
 * adt ls - List ABAP objects in repository
 *
 * Scans the current directory for ABAP objects and outputs their ADT URIs.
 * Supports multiple formats (abapgit, AFF) with auto-detection.
 *
 * Usage:
 *   adt ls                    # Output URIs (one per line)
 *   adt ls --json             # Output JSON with details
 *   adt ls --type CLAS,INTF   # Filter by object type
 *   adt ls --output file.txt  # Write to file
 */

import { Command } from 'commander';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface AbapObject {
  uri: string;
  type: string;
  name: string;
  path: string;
}

// Map file extensions/types to ADT URI paths
const TYPE_TO_URI_PATH: Record<string, string> = {
  clas: '/sap/bc/adt/oo/classes',
  intf: '/sap/bc/adt/oo/interfaces',
  prog: '/sap/bc/adt/programs/programs',
  fugr: '/sap/bc/adt/functions/groups',
  tabl: '/sap/bc/adt/ddic/tables',
  dtel: '/sap/bc/adt/ddic/dataelements',
  doma: '/sap/bc/adt/ddic/domains',
  shlp: '/sap/bc/adt/ddic/searchhelps',
  ttyp: '/sap/bc/adt/ddic/tabletypes',
  view: '/sap/bc/adt/ddic/views',
  ddls: '/sap/bc/adt/ddic/ddl/sources',
  dcls: '/sap/bc/adt/acm/dcl/sources',
  bdef: '/sap/bc/adt/bo/behaviordefinitions',
  srvd: '/sap/bc/adt/ddic/srvd/sources',
  srvb: '/sap/bc/adt/businessservices/bindings',
  msag: '/sap/bc/adt/messageclass',
  tran: '/sap/bc/adt/transactions',
  enho: '/sap/bc/adt/enhancements/enhobjects',
  enhs: '/sap/bc/adt/enhancements/enhspots',
  xslt: '/sap/bc/adt/transformations/xslt',
  // Add more as needed
};

/**
 * Detect repository format
 */
async function detectFormat(
  dir: string,
): Promise<'abapgit' | 'aff' | 'unknown'> {
  // Check for .abapgit.xml
  if (existsSync(join(dir, '.abapgit.xml'))) {
    return 'abapgit';
  }
  if (existsSync(join(dir, 'src', '.abapgit.xml'))) {
    return 'abapgit';
  }

  // Check for AFF format (look for .json files with aff schema)
  const srcDir = join(dir, 'src');
  if (existsSync(srcDir)) {
    try {
      const files = await readdir(srcDir, { recursive: true });
      for (const file of files) {
        if (file.toString().endsWith('.json')) {
          const content = await readFile(
            join(srcDir, file.toString()),
            'utf-8',
          );
          if (content.includes('"$schema"') && content.includes('aff')) {
            return 'aff';
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return 'unknown';
}

/**
 * Scan abapgit format repository
 * Pattern: src/<type>/<name>.<type>.abap
 */
async function scanAbapgitFormat(dir: string): Promise<AbapObject[]> {
  const objects: AbapObject[] = [];
  const srcDir = join(dir, 'src');

  if (!existsSync(srcDir)) {
    return objects;
  }

  async function scanDirectory(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.abap')) {
        // Parse filename: <name>.<type>.abap
        const parts = entry.name.split('.');
        if (parts.length >= 3) {
          const type = parts[parts.length - 2].toLowerCase();
          const name = parts.slice(0, -2).join('.').toUpperCase();

          const uriPath = TYPE_TO_URI_PATH[type];
          if (uriPath) {
            objects.push({
              uri: `${uriPath}/${name.toLowerCase()}`,
              type: type.toUpperCase(),
              name,
              path: fullPath.replace(dir + '/', ''),
            });
          }
        }
      }
    }
  }

  await scanDirectory(srcDir);
  return objects;
}

/**
 * Scan AFF format repository
 * Pattern: src/<type>/<name>.<type>.json (metadata) + .abap (source)
 */
async function scanAffFormat(dir: string): Promise<AbapObject[]> {
  const objects: AbapObject[] = [];
  const srcDir = join(dir, 'src');

  if (!existsSync(srcDir)) {
    return objects;
  }

  async function scanDirectory(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Parse filename: <name>.<type>.json
        const parts = entry.name.split('.');
        if (parts.length >= 3 && parts[parts.length - 1] === 'json') {
          const type = parts[parts.length - 2].toLowerCase();
          const name = parts.slice(0, -2).join('.').toUpperCase();

          const uriPath = TYPE_TO_URI_PATH[type];
          if (uriPath) {
            objects.push({
              uri: `${uriPath}/${name.toLowerCase()}`,
              type: type.toUpperCase(),
              name,
              path: fullPath.replace(dir + '/', ''),
            });
          }
        }
      }
    }
  }

  await scanDirectory(srcDir);
  return objects;
}

/**
 * Main ls command
 */
export const lsCommand = new Command('ls')
  .description('List ABAP objects in repository')
  .option('--json', 'Output as JSON')
  .option(
    '-t, --type <types>',
    'Filter by object type (comma-separated, e.g., CLAS,INTF)',
  )
  .option('-o, --output <file>', 'Write output to file')
  .option(
    '-d, --dir <directory>',
    'Directory to scan (default: current directory)',
  )
  .action(async (options) => {
    const dir = options.dir || process.cwd();

    // Detect format
    const format = await detectFormat(dir);

    if (format === 'unknown') {
      console.error('❌ Could not detect repository format (abapgit or AFF)');
      console.error(
        '   Make sure .abapgit.xml or AFF .json files exist in the repository',
      );
      process.exit(1);
    }

    // Scan objects based on format
    let objects: AbapObject[];
    if (format === 'abapgit') {
      objects = await scanAbapgitFormat(dir);
    } else {
      objects = await scanAffFormat(dir);
    }

    // Filter by type if specified
    if (options.type) {
      const types = options.type.toUpperCase().split(',');
      objects = objects.filter((obj) => types.includes(obj.type));
    }

    // Sort by name
    objects.sort((a, b) => a.name.localeCompare(b.name));

    // Format output
    let output: string;
    if (options.json) {
      output = JSON.stringify(objects, null, 2);
    } else {
      // Default: one URI per line
      output = objects.map((obj) => obj.uri).join('\n');
    }

    // Write to file or stdout
    if (options.output) {
      await writeFile(options.output, output + '\n');
      console.error(
        `✅ Written ${objects.length} objects to ${options.output}`,
      );
    } else {
      console.log(output);
    }
  });
