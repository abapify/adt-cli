/**
 * `adt wb callees <object>` — downward call hierarchy.
 *
 * Thin CLI wrapper over the same endpoint as the MCP tool `get_callees_of`:
 *
 *     GET /sap/bc/adt/repository/informationsystem/callees?objectUri=…
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { resolveObjectUri } from './utils';
import { extractCallHierarchy } from './callers';

export const calleesCommand = new Command('callees')
  .description(
    'Find callees (downward call hierarchy) of a method/function/subroutine',
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
        `/sap/bc/adt/repository/informationsystem/callees?${params.toString()}`,
        { method: 'GET', headers: { Accept: 'application/json' } },
      );

      const payload = { objectName, objectUri, callees: result };

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      const list = extractCallHierarchy(result, 'callee');
      console.log(`📞 Callees of ${objectName}`);
      console.log(`   URI: ${objectUri}`);
      if (list.length === 0) {
        console.log('\nNo callees found.');
        return;
      }
      console.log(`\nFound ${list.length} callee(s):`);
      for (const c of list) {
        console.log(
          `  • ${c.name ?? '(unnamed)'}${c.type ? ` (${c.type})` : ''}`,
        );
        if (c.uri) console.log(`      ${c.uri}`);
      }
    } catch (error) {
      console.error(
        '❌ Callees lookup failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
