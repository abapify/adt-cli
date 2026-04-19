/**
 * `adt wb callers <object>` — upward call hierarchy.
 *
 * Thin CLI wrapper over the same endpoint as the MCP tool `get_callers_of`:
 *
 *     GET /sap/bc/adt/repository/informationsystem/callers?objectUri=…
 *
 * The real-e2e test additionally probes `/sap/bc/adt/abapsource/callers`
 * (mentioned in the E15 spec) to capture which endpoint TRL exposes.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { resolveObjectUri } from './utils';

export const callersCommand = new Command('callers')
  .description(
    'Find callers (upward call hierarchy) of a method/function/subroutine',
  )
  .argument('<object>', 'Object name (class, function group, program, …)')
  .option('-t, --type <type>', 'Object type (CLAS, FUGR, PROG, …)')
  .option('--uri <uri>', 'Direct ADT URI (skips name resolution)')
  .option('-m, --max <number>', 'Maximum number of results', '50')
  .option('--json', 'Output results as JSON')
  .action(async (objectName: string, options) => {
    try {
      const adtClient = await getAdtClientV2();
      const maxResults = Number.parseInt(options.max, 10);

      const objectUri =
        options.uri ??
        (await resolveObjectUri(adtClient, objectName, options.type));
      if (!objectUri) {
        console.error(`❌ Object '${objectName}' not found`);
        process.exit(1);
      }

      const params = new URLSearchParams({
        objectUri,
        maxResults: String(maxResults),
      });

      const result = await adtClient.fetch(
        `/sap/bc/adt/repository/informationsystem/callers?${params.toString()}`,
        { method: 'GET', headers: { Accept: 'application/json' } },
      );

      const payload = { objectName, objectUri, callers: result };

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      const list = extractCallHierarchy(result, 'caller');
      console.log(`📞 Callers of ${objectName}`);
      console.log(`   URI: ${objectUri}`);
      if (list.length === 0) {
        console.log('\nNo callers found.');
        return;
      }
      console.log(`\nFound ${list.length} caller(s):`);
      for (const c of list) {
        const typeSuffix = c.type ? ` (${c.type})` : '';
        console.log(`  • ${c.name ?? '(unnamed)'}${typeSuffix}`);
        if (c.uri) console.log(`      ${c.uri}`);
      }
    } catch (error) {
      console.error(
        '❌ Callers lookup failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

export function extractCallHierarchy(
  raw: unknown,
  itemKey: 'caller' | 'callee',
): Array<{ name?: string; type?: string; uri?: string }> {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const containerKey = `${itemKey}s` as const;
  const container = obj[containerKey] as Record<string, unknown> | undefined;
  const list = container?.[itemKey] ?? obj[itemKey];
  if (!list) return [];
  return Array.isArray(list)
    ? (list as Array<Record<string, unknown>>)
    : [list as Record<string, unknown>];
}
