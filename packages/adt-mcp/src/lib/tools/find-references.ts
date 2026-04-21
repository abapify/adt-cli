/**
 * Tool: find_references – find all usages (where-used) of an ABAP symbol
 *
 * Uses the real SAP ADT where-used protocol (2-step POST):
 *
 *   1. POST /repository/informationsystem/usageReferences/scope
 *   2. POST /repository/informationsystem/usageReferences
 *
 * The earlier GET /usages endpoint used by this tool does not exist on
 * real SAP systems (verified on TRL BTP trial, 2025-11). See
 * `@abapify/adt-contracts/adt/repository/informationsystem/usagereferences`
 * for the full protocol reference.
 *
 * Response parsing is deliberately minimal — we extract the most useful
 * fields (object name/type/uri/package) and return them as JSON so the
 * MCP client gets structured data without depending on an XSD schema for
 * the usagereferences namespace.
 */

import { z } from 'zod';
import { DOMParser } from '@xmldom/xmldom';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';
import {
  buildUsageReferenceRequestXml,
  buildUsageScopeRequestXml,
} from '@abapify/adt-contracts';

interface Reference {
  uri?: string;
  parentUri?: string;
  isResult?: string;
  usageInformation?: string;
  name?: string;
  type?: string;
  responsible?: string;
  packageUri?: string;
  packageName?: string;
}

// XML namespace URIs per SAP ADT / W3C XML Namespaces spec — opaque
// identifiers, not network endpoints. Must match SAP wire format exactly.
// https://www.w3.org/TR/xml-names/
const NS_USAGE = 'http://www.sap.com/adt/ris/usageReferences'; // NOSONAR: XML namespace identifier (not a URL)
const NS_CORE = 'http://www.sap.com/adt/core'; // NOSONAR: XML namespace identifier (not a URL)

/**
 * Extract a compact list of referenced objects from the usageReferenceResult
 * XML returned by step 2. Uses a namespace-aware DOM walk (linear cost) so
 * that we don't trip S5852 / js/polynomial-redos on crafted responses.
 */
function parseReferences(
  xml: string,
  max: number,
): {
  numberOfResults?: string;
  description?: string;
  results: Reference[];
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
  const results: Reference[] = [];
  for (let i = 0; i < refs.length && results.length < max; i++) {
    const el = refs.item(i);
    if (!el) continue;
    const ref: Reference = {
      uri: el.getAttribute('uri') || undefined,
      parentUri: el.getAttribute('parentUri') || undefined,
      isResult: el.getAttribute('isResult') || undefined,
      usageInformation: el.getAttribute('usageInformation') || undefined,
    };
    const adtObj = el.getElementsByTagNameNS(NS_USAGE, 'adtObject').item(0);
    if (adtObj) {
      ref.name = adtObj.getAttributeNS(NS_CORE, 'name') || undefined;
      ref.type = adtObj.getAttributeNS(NS_CORE, 'type') || undefined;
      ref.responsible =
        adtObj.getAttributeNS(NS_CORE, 'responsible') || undefined;
    }
    const pkgRef = el.getElementsByTagNameNS(NS_CORE, 'packageRef').item(0);
    if (pkgRef) {
      ref.packageName = pkgRef.getAttributeNS(NS_CORE, 'name') || undefined;
      ref.packageUri = pkgRef.getAttributeNS(NS_CORE, 'uri') || undefined;
    }
    results.push(ref);
  }

  return { numberOfResults, description, results };
}

export function registerFindReferencesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'find_references',
    'Find all usages (where-used) of an ABAP object or symbol. Uses the 2-step POST /usageReferences protocol.',
    {
      ...sessionOrConnectionShape,
      objectName: z
        .string()
        .describe('Name of the ABAP object to find references for'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, PROG, DTEL, TABL)'),
      objectUri: z
        .string()
        .optional()
        .describe(
          'Direct ADT URI of the object (skips name resolution if provided)',
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 100)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const maxResults = args.maxResults ?? 100;

        let objectUri = args.objectUri;
        if (!objectUri) {
          objectUri = await resolveObjectUri(
            client,
            args.objectName,
            args.objectType,
          );
          if (!objectUri) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Object '${args.objectName}' not found`,
                },
              ],
            };
          }
        }

        // Step 1: fetch the default scope
        const scopeXml =
          await client.adt.repository.informationsystem.usageReferences.scope.post(
            { uri: objectUri, version: 'active' },
            buildUsageScopeRequestXml(),
          );

        // Step 2: run the search, echoing the scope blob back
        const searchXml =
          await client.adt.repository.informationsystem.usageReferences.search.post(
            { uri: objectUri, version: 'active' },
            buildUsageReferenceRequestXml(String(scopeXml)),
          );

        const parsed = parseReferences(String(searchXml), maxResults);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  objectName: args.objectName,
                  objectUri,
                  ...parsed,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Find references failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
