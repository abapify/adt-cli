/**
 * adt cts tr objects <TR> - Query and filter transport objects
 *
 * Supports filtering by obj_func, pgmid, and object type.
 * Multiple transports can be queried with --also-transport.
 *
 * Examples:
 *   adt cts tr objects DEVK900001 --obj-func D --pgmid R3TR --json
 *   adt cts tr objects DEVK900001 --also-transport DEVK900002 --obj-func D --json
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../../utils/adt-client-v2';
import { parseFilterOption } from '../../../utils/command-helpers';
import { resolveTransportObjects } from '@abapify/adk';
import type { TransportObjectSelector } from '@abapify/adk';

type ResolvedTransportObjects = Awaited<
  ReturnType<typeof resolveTransportObjects>
>;

/** Merge the primary transport with --also-transport numbers. */
function collectTransportNumbers(
  transport: string,
  alsoTransport: string | undefined,
): string[] {
  const alsoTrParsed = parseFilterOption(alsoTransport, true);
  const alsoTrSingle: string[] = alsoTrParsed ? [alsoTrParsed as string] : [];
  const alsoTrArray: string[] = Array.isArray(alsoTrParsed)
    ? alsoTrParsed
    : alsoTrSingle;
  return [transport, ...alsoTrArray];
}

/** Build selector from CLI flags using the parseFilter helper. */
function buildSelector(options: {
  objFunc?: string;
  pgmid?: string;
  type?: string;
}): TransportObjectSelector {
  const selector: TransportObjectSelector = {};

  const objFunc = parseFilterOption(options.objFunc);
  if (objFunc !== undefined) selector.objFunc = objFunc;

  const pgmid = parseFilterOption(options.pgmid);
  if (pgmid !== undefined) selector.pgmid = pgmid;

  const type = parseFilterOption(options.type, true);
  if (type !== undefined) selector.type = type;

  return selector;
}

/** Print the object listing as JSON. */
function printObjectsJson(
  allTransportNumbers: string[],
  selector: TransportObjectSelector,
  objects: ResolvedTransportObjects['objects'],
  sourceTransportMap: ResolvedTransportObjects['sourceTransportMap'],
  fallbackTransport: string,
): void {
  const output = {
    transports: allTransportNumbers,
    filter: {
      obj_func: selector.objFunc ?? '*',
      pgmid: selector.pgmid ?? '*',
      type: selector.type ?? '*',
    },
    objects: objects.map((obj) => ({
      pgmid: obj.pgmid,
      type: obj.type,
      name: obj.name,
      obj_func: obj.objFunc,
      source_transport: sourceTransportMap.get(obj.key) ?? fallbackTransport,
    })),
  };
  console.log(JSON.stringify(output, null, 2));
}

/** Print the object listing as a human-readable list. */
function printObjectsText(
  allTransportNumbers: string[],
  objects: ResolvedTransportObjects['objects'],
  sourceTransportMap: ResolvedTransportObjects['sourceTransportMap'],
): void {
  console.log(
    `📦 Objects in ${allTransportNumbers.join(', ')} (${objects.length} found):`,
  );
  for (const obj of objects) {
    const funcLabel = obj.objFunc ? ` [obj_func=${obj.objFunc}]` : '';
    const srcLabel =
      allTransportNumbers.length > 1
        ? ` (${sourceTransportMap.get(obj.key)})`
        : '';
    console.log(
      `  ${obj.pgmid}/${obj.type} ${obj.name}${funcLabel}${srcLabel}`,
    );
  }
}

export const ctsObjectsCommand = new Command('objects')
  .description('List objects in a transport request with optional filters')
  .argument('<transport>', 'Transport number (e.g., DEVK900001)')
  .option(
    '--obj-func <func>',
    'Filter by object function code (comma-separated, e.g. D or D,K). Default: all',
  )
  .option(
    '--pgmid <pgmid>',
    'Filter by program ID (comma-separated, e.g. R3TR or R3TR,LIMU). Default: all',
  )
  .option(
    '--type <types>',
    'Filter by object type (comma-separated, e.g. CLAS,TABL). Default: all',
  )
  .option(
    '--also-transport <numbers>',
    'Additional transport numbers to merge (comma-separated)',
  )
  .option('--json', 'Output as JSON')
  .action(async (transport: string, options) => {
    try {
      await getAdtClientV2();

      const allTransportNumbers = collectTransportNumbers(
        transport,
        options.alsoTransport,
      );

      // Build selector from CLI flags using the parseFilter helper
      const selector = buildSelector(options);

      // Load and optionally merge transports
      const { objects, sourceTransportMap } = await resolveTransportObjects(
        allTransportNumbers,
        selector,
      );

      if (options.json) {
        printObjectsJson(
          allTransportNumbers,
          selector,
          objects,
          sourceTransportMap,
          transport,
        );
      } else {
        printObjectsText(allTransportNumbers, objects, sourceTransportMap);
      }
    } catch (error) {
      console.error(
        '❌ Failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
