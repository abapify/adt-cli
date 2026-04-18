/**
 * `adt wb definition <reference>` — navigate to the definition of a symbol.
 *
 * Thin CLI wrapper over the same endpoint as the MCP tool `find_definition`:
 *
 *     GET /sap/bc/adt/navigation/target?objectName=…&objectType=…&context=…&contextType=…
 *
 * If the navigation endpoint returns nothing, falls back to a name lookup
 * via quickSearch (matching the MCP behaviour).
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { resolveObjectUri } from './utils';

export const definitionCommand = new Command('definition')
  .description(
    'Navigate to the definition of an ABAP symbol (class, method, type, FM, …)',
  )
  .argument('<reference>', 'Symbol / object name to navigate to')
  .option('-t, --type <type>', 'Object type (CLAS, PROG, DTEL, TABL, …)')
  .option(
    '--parent <name>',
    'Parent object name (e.g. class name when looking for a method)',
  )
  .option('--parent-type <type>', 'Parent object type (e.g. CLAS)')
  .option('--json', 'Output result as JSON')
  .action(async (reference: string, options) => {
    try {
      const adtClient = await getAdtClientV2();

      const params = new URLSearchParams({ objectName: reference });
      if (options.type) params.set('objectType', options.type);
      if (options.parent) params.set('context', options.parent);
      if (options.parentType) params.set('contextType', options.parentType);

      let result: unknown;
      try {
        result = await adtClient.fetch(
          `/sap/bc/adt/navigation/target?${params.toString()}`,
          { method: 'GET', headers: { Accept: 'application/json' } },
        );
      } catch {
        result = undefined;
      }

      if (!result) {
        const uri = await resolveObjectUri(adtClient, reference, options.type);
        if (uri) {
          const payload = { objectName: reference, uri };
          if (options.json) {
            console.log(JSON.stringify(payload, null, 2));
          } else {
            console.log(`🎯 Definition of ${reference}`);
            console.log(`   URI: ${uri}`);
          }
          return;
        }
        console.error(`❌ No definition found for '${reference}'`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const ref = extractRef(result);
      console.log(`🎯 Definition of ${reference}`);
      if (ref?.name) console.log(`   Name: ${ref.name}`);
      if (ref?.type) console.log(`   Type: ${ref.type}`);
      if (ref?.uri) console.log(`   URI:  ${ref.uri}`);
      if (ref?.description) console.log(`   Desc: ${ref.description}`);
      if (!ref) console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(
        '❌ Definition lookup failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

function extractRef(raw: unknown):
  | {
      name?: string;
      type?: string;
      uri?: string;
      description?: string;
    }
  | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const ref = (obj.objectReference ?? obj) as Record<string, unknown>;
  if (typeof ref !== 'object' || ref === null) return undefined;
  return {
    name: ref.name as string | undefined,
    type: ref.type as string | undefined,
    uri: ref.uri as string | undefined,
    description: ref.description as string | undefined,
  };
}
