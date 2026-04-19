/**
 * `adt wb where-used <object> [--type <TYPE>]` — find all usages of an object.
 *
 * Uses the real SAP ADT 2-step POST flow (same protocol the MCP
 * `find_references` tool speaks), exposed via the typed contract
 * `client.adt.repository.informationsystem.usageReferences.{scope,search}`.
 *
 *   1. POST /repository/informationsystem/usageReferences/scope
 *   2. POST /repository/informationsystem/usageReferences
 *
 * The older GET /usages endpoint does not exist on real SAP systems
 * (verified on TRL, 2025-11).
 */

import { Command } from 'commander';
import { DOMParser } from '@xmldom/xmldom';
import {
  buildUsageReferenceRequestXml,
  buildUsageScopeRequestXml,
} from '@abapify/adt-contracts';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { resolveObjectUri } from './utils';

interface Usage {
  uri?: string;
  parentUri?: string;
  name?: string;
  type?: string;
  packageName?: string;
}

const NS_USAGE = 'http://www.sap.com/adt/ris/usageReferences';
const NS_CORE = 'http://www.sap.com/adt/core';

/**
 * Parse the `usagereferences:usageReferenceResult` XML using a real DOM
 * parser (linear, namespace-aware) instead of regexes. This avoids the
 * super-linear backtracking patterns flagged by S5852 / js/polynomial-redos.
 */
function parseUsages(
  xml: string,
  max: number,
): {
  numberOfResults?: string;
  description?: string;
  usages: Usage[];
} {
  const doc = new DOMParser({
    onError: () => {
      /* swallow parse warnings/errors – caller only cares about extracted fields */
    },
  }).parseFromString(xml, 'text/xml');

  const root = doc.documentElement;
  const numberOfResults = root?.getAttribute('numberOfResults') || undefined;
  const description = root?.getAttribute('resultDescription') || undefined;

  const refs = doc.getElementsByTagNameNS(NS_USAGE, 'referencedObject');
  const usages: Usage[] = [];
  for (let i = 0; i < refs.length && usages.length < max; i++) {
    const el = refs.item(i);
    if (!el) continue;
    const u: Usage = {
      uri: el.getAttribute('uri') || undefined,
      parentUri: el.getAttribute('parentUri') || undefined,
    };
    const adtObj = el.getElementsByTagNameNS(NS_USAGE, 'adtObject').item(0);
    if (adtObj) {
      u.name = adtObj.getAttributeNS(NS_CORE, 'name') || undefined;
      u.type = adtObj.getAttributeNS(NS_CORE, 'type') || undefined;
    }
    const pkgRef = el.getElementsByTagNameNS(NS_CORE, 'packageRef').item(0);
    if (pkgRef) {
      u.packageName = pkgRef.getAttributeNS(NS_CORE, 'name') || undefined;
    }
    usages.push(u);
  }
  return { numberOfResults, description, usages };
}

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

      const scopeXml =
        await adtClient.adt.repository.informationsystem.usageReferences.scope.post(
          { uri: objectUri, version: 'active' },
          buildUsageScopeRequestXml(),
        );

      const searchXml =
        await adtClient.adt.repository.informationsystem.usageReferences.search.post(
          { uri: objectUri, version: 'active' },
          buildUsageReferenceRequestXml(String(scopeXml)),
        );

      const parsed = parseUsages(String(searchXml), maxResults);
      const payload = { objectName, objectUri, ...parsed };

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log(`🔍 Where-used: ${objectName}`);
      console.log(`   URI: ${objectUri}`);
      if (parsed.description) console.log(`   ${parsed.description}`);
      if (parsed.usages.length === 0) {
        console.log('\nNo references found.');
        return;
      }
      console.log(
        `\nFound ${parsed.usages.length}${parsed.numberOfResults ? ` of ${parsed.numberOfResults}` : ''} reference(s):`,
      );
      for (const u of parsed.usages) {
        const head = `  • ${u.name ?? '(unnamed)'}${u.type ? ` (${u.type})` : ''}`;
        console.log(head);
        if (u.uri) console.log(`      ${u.uri}`);
        if (u.packageName) console.log(`      package: ${u.packageName}`);
      }
    } catch (error) {
      console.error(
        '❌ Where-used failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
