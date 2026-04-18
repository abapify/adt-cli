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
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
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

/**
 * Extract a compact list of referenced objects from the usageReferenceResult
 * XML returned by step 2. A lightweight regex walk is sufficient because the
 * schema is stable and the response is single-namespaced.
 */
function parseReferences(xml: string, max: number): {
  numberOfResults?: string;
  description?: string;
  results: Reference[];
} {
  const numberOfResults = /numberOfResults="([^"]*)"/.exec(xml)?.[1];
  const description = /resultDescription="([^"]*)"/.exec(xml)?.[1];

  const results: Reference[] = [];
  // Each <usagereferences:referencedObject …>…</usagereferences:referencedObject>
  const refBlockRe =
    /<usagereferences:referencedObject\s+([^>]*)>([\s\S]*?)<\/usagereferences:referencedObject>/g;

  let m: RegExpExecArray | null;
  while ((m = refBlockRe.exec(xml)) !== null && results.length < max) {
    const attrs = m[1];
    const body = m[2];

    const ref: Reference = {
      uri: /uri="([^"]*)"/.exec(attrs)?.[1],
      parentUri: /parentUri="([^"]*)"/.exec(attrs)?.[1],
      isResult: /isResult="([^"]*)"/.exec(attrs)?.[1],
      usageInformation: /usageInformation="([^"]*)"/.exec(attrs)?.[1],
    };

    const adtObjAttrs = /<usagereferences:adtObject\s+([^/>]*)\/?>/.exec(body)?.[1];
    if (adtObjAttrs) {
      ref.name = /adtcore:name="([^"]*)"/.exec(adtObjAttrs)?.[1];
      ref.type = /adtcore:type="([^"]*)"/.exec(adtObjAttrs)?.[1];
      ref.responsible = /adtcore:responsible="([^"]*)"/.exec(adtObjAttrs)?.[1];
    }

    const pkgRef = /<adtcore:packageRef\s+([^/>]*)\/?>/.exec(body)?.[1];
    if (pkgRef) {
      ref.packageName = /adtcore:name="([^"]*)"/.exec(pkgRef)?.[1];
      ref.packageUri = /adtcore:uri="([^"]*)"/.exec(pkgRef)?.[1];
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
      ...connectionShape,
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
    async (args) => {
      try {
        const client = ctx.getClient(args);
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
        const scopeXml = await client.adt.repository.informationsystem.usageReferences.scope.post(
          { uri: objectUri, version: 'active' },
          buildUsageScopeRequestXml(),
        );

        // Step 2: run the search, echoing the scope blob back
        const searchXml = await client.adt.repository.informationsystem.usageReferences.search.post(
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
