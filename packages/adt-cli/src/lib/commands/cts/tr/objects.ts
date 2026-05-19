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
import { AdkTransport, MergedTransportView } from '@abapify/adk';
import type {
  TransportObjectSelector,
  AdkTransportObjectRef,
} from '@abapify/adk';

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

      const allTransportNumbers = [
        transport,
        ...(options.alsoTransport
          ? options.alsoTransport
              .split(',')
              .map((s: string) => s.trim().toUpperCase())
              .filter(Boolean)
          : []),
      ];

      // Build selector from CLI flags
      const selector: TransportObjectSelector = {};

      if (options.objFunc) {
        const parts: string[] = options.objFunc
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        selector.objFunc = parts.length === 1 ? parts[0] : parts;
      }

      if (options.pgmid) {
        const parts: string[] = options.pgmid
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        selector.pgmid = parts.length === 1 ? parts[0] : parts;
      }

      if (options.type) {
        const parts: string[] = options.type
          .split(',')
          .map((s: string) => s.trim().toUpperCase())
          .filter(Boolean);
        selector.type = parts.length === 1 ? parts[0] : parts;
      }

      // Load and optionally merge transports
      let objects: AdkTransportObjectRef[];
      let sourceTransportMap: Map<string, string> = new Map(); // key → TR number

      if (allTransportNumbers.length === 1) {
        const tr = await AdkTransport.get(transport);
        const filtered =
          Object.keys(selector).length > 0
            ? tr.getObjectsBySelector(selector)
            : tr.objects;
        objects = filtered;
        for (const obj of objects) {
          sourceTransportMap.set(obj.key, transport);
        }
      } else {
        // Build source map before merging so we know the first-win TR
        const transports = await Promise.all(
          allTransportNumbers.map((n) => AdkTransport.get(n)),
        );
        const seen = new Set<string>();
        objects = [];
        for (const tr of transports) {
          const filtered =
            Object.keys(selector).length > 0
              ? tr.getObjectsBySelector(selector)
              : tr.objects;
          for (const obj of filtered) {
            if (!seen.has(obj.key)) {
              seen.add(obj.key);
              objects.push(obj);
              sourceTransportMap.set(obj.key, tr.number);
            }
          }
        }
      }

      if (options.json) {
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
            source_transport: sourceTransportMap.get(obj.key) ?? transport,
          })),
        };
        console.log(JSON.stringify(output, null, 2));
      } else {
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
    } catch (error) {
      console.error(
        '❌ Failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
