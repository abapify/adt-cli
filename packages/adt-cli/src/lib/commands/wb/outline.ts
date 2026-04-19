/**
 * `adt wb outline <object>` — structural tree of an ABAP object.
 *
 * Mirrors the MCP tool `get_object_structure` — dispatches to typed
 * contract `objectstructure()` methods when available, falls back to
 * the generic `repository.objectstructure` contract at
 * `{objectUri}/objectstructure`.
 *
 * ADT endpoint (generic):
 *     GET {objectUri}/objectstructure
 */

import { Command } from 'commander';
import type { AdtClient } from '@abapify/adt-client';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { resolveObjectUri, resolveObjectUriFromType } from './utils';

async function fetchObjectStructure(
  client: AdtClient,
  objectName: string,
  objectType: string | undefined,
  version: 'active' | 'inactive',
): Promise<unknown> {
  const name = objectName.toLowerCase();
  const type = objectType?.toUpperCase().split('/')[0];
  const structureOptions = { version };

  switch (type) {
    case 'PROG':
      return client.adt.programs.programs.objectstructure(
        name,
        structureOptions,
      );
    case 'CLAS':
      return client.adt.oo.classes.objectstructure(name, structureOptions);
    case 'INTF':
      return client.adt.oo.interfaces.objectstructure(name, structureOptions);
    case 'FUGR':
      return client.adt.functions.groups.objectstructure(
        name,
        structureOptions,
      );
    default: {
      const uri =
        (type && resolveObjectUriFromType(type, objectName)) ||
        (await resolveObjectUri(client, objectName, objectType));
      if (!uri) throw new Error(`Object '${objectName}' not found`);
      return client.adt.repository.objectstructure.get({
        objectUri: uri,
        version,
      });
    }
  }
}

export const outlineCommand = new Command('outline')
  .description(
    'Show the structural outline of an ABAP object (includes, methods, attributes, …)',
  )
  .argument('<object>', 'Object name')
  .option('-t, --type <type>', 'Object type (CLAS, INTF, PROG, FUGR, …)')
  .option(
    '--version <v>',
    'Object version to inspect: active | inactive',
    'active',
  )
  .option('--json', 'Output as JSON (default pretty-prints JSON structure)')
  .action(async (objectName: string, options) => {
    try {
      const adtClient = await getAdtClientV2();
      const version = options.version === 'inactive' ? 'inactive' : 'active';

      const result = await fetchObjectStructure(
        adtClient,
        objectName,
        options.type,
        version,
      );

      // The outline response shape varies wildly between object types.
      // Emit JSON by default — this is the machine-friendly contract
      // mirrored by the MCP tool.
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(
        '❌ Outline failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
