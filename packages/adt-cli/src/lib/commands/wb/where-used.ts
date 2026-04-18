/**
 * `adt wb where-used <object> [--type <TYPE>]` — find all usages of an object.
 *
 * Thin CLI wrapper over the same ADT endpoint used by the MCP tool
 * `find_references`:
 *
 *     GET /sap/bc/adt/repository/informationsystem/usages
 *
 * NOTE: sapcli and some Eclipse clients use
 * `/sap/bc/adt/repository/informationsystem/usageReferences` which accepts
 * a POST body describing the reference scope. The simpler `usages` GET is
 * what the existing MCP tool already speaks; the real-e2e test
 * (`parity.e15-wb.real.test.ts`) probes both endpoints and records which
 * one the target system serves.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { resolveObjectUri } from './utils';

export const whereUsedCommand = new Command('where-used')
  .description('Find all usages (where-used) of an ABAP object or symbol')
  .argument('<object>', 'Object name to search references for')
  .option('-t, --type <type>', 'Object type (CLAS, PROG, INTF, TABL, …)')
  .option('--uri <uri>', 'Direct ADT URI (skips name resolution)')
  .option('-m, --max <number>', 'Maximum number of results', '100')
  .option('--json', 'Output results as JSON')
  .action(async (objectName: string, options) => {
    try {
      const adtClient = await getAdtClientV2();
      const maxResults = Number.parseInt(options.max, 10);

      let objectUri: string | undefined = options.uri;
      if (!objectUri) {
        objectUri = await resolveObjectUri(adtClient, objectName, options.type);
        if (!objectUri) {
          console.error(`❌ Object '${objectName}' not found`);
          process.exit(1);
        }
      }

      const params = new URLSearchParams({
        objectUri,
        objectName,
        maxResults: String(maxResults),
      });
      if (options.type) params.set('objectType', options.type);

      const result = await adtClient.fetch(
        `/sap/bc/adt/repository/informationsystem/usages?${params.toString()}`,
        { method: 'GET', headers: { Accept: 'application/json' } },
      );

      const payload = { objectName, objectUri, results: result };

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log(`🔍 Where-used: ${objectName}`);
      console.log(`   URI: ${objectUri}`);
      const usages = extractUsages(result);
      if (usages.length === 0) {
        console.log('\nNo references found.');
        return;
      }
      console.log(`\nFound ${usages.length} reference(s):`);
      for (const u of usages) {
        const head = `  • ${u.name ?? '(unnamed)'}${u.type ? ` (${u.type})` : ''}`;
        console.log(head);
        if (u.uri) console.log(`      ${u.uri}`);
        if (u.location) console.log(`      ${u.location}`);
      }
    } catch (error) {
      console.error(
        '❌ Where-used failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

function extractUsages(
  raw: unknown,
): Array<{ name?: string; type?: string; uri?: string; location?: string }> {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const container = obj.usages as { usage?: unknown } | undefined;
  const list = container?.usage ?? obj.usage;
  if (!list) return [];
  return Array.isArray(list)
    ? (list as Array<Record<string, unknown>>)
    : [list as Record<string, unknown>];
}
