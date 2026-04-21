/**
 * `adt changeset add` — stage a single object write into an existing
 * changeset. Acquires a lock + PUTs the source, then records the entry.
 * Activation is deferred to `adt changeset commit`.
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { ChangesetService } from '../../services/changeset';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { loadChangeset, saveChangeset } from './state';

/**
 * Minimal type → ADT URI mapping. Kept here (rather than imported from
 * adt-mcp) so the CLI remains the leaf dependency. Extend as needed.
 */
function resolveUri(objectType: string, objectName: string): string {
  const type = objectType.toUpperCase().split('/')[0];
  const n = encodeURIComponent(objectName.toLowerCase());
  switch (type) {
    case 'PROG':
      return `/sap/bc/adt/programs/programs/${n}`;
    case 'INCL':
      return `/sap/bc/adt/programs/includes/${n}`;
    case 'CLAS':
      return `/sap/bc/adt/oo/classes/${n}`;
    case 'INTF':
      return `/sap/bc/adt/oo/interfaces/${n}`;
    case 'FUGR':
      return `/sap/bc/adt/functions/groups/${n}`;
    default:
      throw new Error(
        `Unsupported object type '${objectType}'. ` +
          `Pass --object-uri to bypass URI resolution.`,
      );
  }
}

export const changesetAddCommand = new Command('add')
  .description('Stage an object write into an open changeset (lock + PUT)')
  .requiredOption('--changeset <id>', 'Changeset id from `changeset begin`')
  .option('--object-name <name>', 'ABAP object name')
  .option('--object-type <type>', 'Object type (PROG, CLAS, INTF, FUGR, INCL)')
  .option(
    '--object-uri <uri>',
    'Explicit ADT object URI (overrides name/type resolution)',
  )
  .option('--source <source>', 'New source code (inline)')
  .option(
    '--source-file <path>',
    'Path to a file whose contents replace the source',
  )
  .option('--transport <tr>', 'Transport request')
  .option(
    '-s, --system <systemId>',
    'Logical system bucket for on-disk state',
    'default',
  )
  .option('--json', 'Emit the updated entry as JSON', false)
  .action(async (options) => {
    try {
      if (!options.source && !options.sourceFile) {
        throw new Error('either --source or --source-file must be supplied');
      }
      if (!options.objectUri && (!options.objectName || !options.objectType)) {
        throw new Error(
          'either --object-uri OR both --object-name and --object-type must be supplied',
        );
      }

      const source: string = options.source
        ? String(options.source)
        : readFileSync(options.sourceFile, 'utf-8');

      const cs = loadChangeset(options.system, options.changeset);
      const client = await getAdtClientV2();
      const service = new ChangesetService(client);

      const objectUri: string =
        options.objectUri ?? resolveUri(options.objectType, options.objectName);
      const objectType: string = options.objectType ?? 'UNKN';
      const objectName: string =
        options.objectName ?? objectUri.split('/').pop() ?? 'UNKNOWN';

      const entry = await service.add(cs, {
        objectUri,
        objectType,
        objectName,
        source,
        transport: options.transport,
      });
      saveChangeset(options.system, cs);

      if (options.json) {
        console.log(JSON.stringify({ changeset: cs, entry }, null, 2));
      } else {
        console.log(`✅ Added to changeset ${cs.id}`);
        console.log(`   ${entry.objectType} ${entry.objectName}`);
        console.log(`   uri: ${entry.objectUri}`);
        console.log(`   lockHandle: ${entry.lockHandle}`);
      }
    } catch (error) {
      console.error(
        '❌ changeset add failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
