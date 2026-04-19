/**
 * `adt wb definition <reference>` — resolve a symbol's ADT URI.
 *
 * The SAP ADT `/sap/bc/adt/navigation/target` endpoint requires POST (GET
 * returns 405) with an undocumented body that we have not been able to
 * reverse-engineer (every attempt returns 400 "I::000" on TRL). Until a
 * real Eclipse ADT network capture is available, this command uses the
 * repository information system search to return the object's ADT URI —
 * the most important part of a definition for downstream tooling.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

interface ObjRef {
  name?: string;
  type?: string;
  uri?: string;
  packageName?: string;
  description?: string;
}

function pickObjectReferences(raw: unknown): ObjRef[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const root =
    (obj.objectReferences as Record<string, unknown> | undefined) ?? obj;
  const list = (root?.objectReference ?? root?.object ?? []) as
    | Record<string, unknown>
    | Record<string, unknown>[];
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((r) => ({
    name: r.name as string | undefined,
    type: r.type as string | undefined,
    uri: r.uri as string | undefined,
    packageName: r.packageName as string | undefined,
    description: r.description as string | undefined,
  }));
}

export const definitionCommand = new Command('definition')
  .description(
    'Resolve an ABAP symbol (class, interface, function, data element, …) to its ADT URI',
  )
  .argument('<reference>', 'Symbol / object name to resolve')
  .option('-t, --type <type>', 'Object type (CLAS, PROG, DTEL, TABL, …)')
  .option('--json', 'Output result as JSON')
  .action(async (reference: string, options) => {
    try {
      const adtClient = await getAdtClientV2();

      const searchResult =
        await adtClient.adt.repository.informationsystem.search.quickSearch({
          query: reference,
          maxResults: 10,
        });

      const refs = pickObjectReferences(searchResult);
      const hit = refs.find(
        (o) =>
          String(o.name ?? '').toUpperCase() === reference.toUpperCase() &&
          (!options.type ||
            String(o.type ?? '')
              .toUpperCase()
              .startsWith(options.type.toUpperCase())),
      );

      if (!hit?.uri) {
        const typeSuffix = options.type ? ` (type: ${options.type})` : '';
        console.error(`❌ No definition found for '${reference}'${typeSuffix}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(hit, null, 2));
        return;
      }

      console.log(`🎯 Definition of ${reference}`);
      if (hit.name) console.log(`   Name: ${hit.name}`);
      if (hit.type) console.log(`   Type: ${hit.type}`);
      if (hit.uri) console.log(`   URI:  ${hit.uri}`);
      if (hit.packageName) console.log(`   Pkg:  ${hit.packageName}`);
      if (hit.description) console.log(`   Desc: ${hit.description}`);
    } catch (error) {
      console.error(
        '❌ Definition lookup failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
