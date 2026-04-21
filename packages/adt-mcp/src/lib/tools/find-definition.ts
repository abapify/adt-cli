/**
 * Tool: find_definition – navigate to the definition of an ABAP symbol
 *
 * The SAP ADT /sap/bc/adt/navigation/target endpoint requires POST (GET
 * returns 405) and a non-documented request body. On real systems we
 * tested (TRL BTP trial, 2025-11) every attempted body shape returned
 * 400 "I::000", so this tool now uses the repository information system
 * search instead — resolve the object URI by name/type and return it.
 *
 * This matches what navigation/target returns when it works (a link +
 * object identity) and is sufficient for the MCP use case: "give me the
 * ADT URI for <symbol>". Future work: capture a real Eclipse ADT
 * navigation/target request and promote this to a proper POST contract.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { extractObjectReferences, resolveObjectUri } from './utils';

export function registerFindDefinitionTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'find_definition',
    'Resolve an ABAP symbol (class, interface, function, data element, …) to its ADT object URI.',
    {
      ...sessionOrConnectionShape,
      objectName: z
        .string()
        .describe('Name of the symbol or object to resolve'),
      objectType: z
        .string()
        .optional()
        .describe(
          'Object type to narrow the search (e.g. CLAS, PROG, DTEL, TABL)',
        ),
      parentObjectName: z
        .string()
        .optional()
        .describe(
          'Parent object name (e.g. class name when looking for a method) — currently used as a hint for scoping',
        ),
      parentObjectType: z
        .string()
        .optional()
        .describe('Parent object type (e.g. CLAS)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        // Prefer the parent object when the caller asks for a nested symbol;
        // the ADT URI of the parent is the "closest" definition we can offer
        // without the proprietary navigation/target POST body.
        if (args.parentObjectName) {
          const parentUri = await resolveObjectUri(
            client,
            args.parentObjectName,
            args.parentObjectType,
          );
          if (parentUri) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      objectName: args.objectName,
                      parentObjectName: args.parentObjectName,
                      uri: parentUri,
                      note: 'Returned parent object URI — nested symbol navigation requires the proprietary POST /sap/bc/adt/navigation/target protocol, not yet supported.',
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        }

        // Fallback: resolve by name + optional type via quick-search.
        const searchResult =
          await client.adt.repository.informationsystem.search.quickSearch({
            query: args.objectName,
            maxResults: 10,
          });
        const target = extractObjectReferences(searchResult).find(
          (o) =>
            String(o.name ?? '').toUpperCase() ===
              args.objectName.toUpperCase() &&
            (!args.objectType ||
              String(o.type ?? '')
                .toUpperCase()
                .startsWith(args.objectType.toUpperCase())),
        );

        if (!target?.uri) {
          const typeSuffix = args.objectType
            ? ` (type: ${args.objectType})`
            : '';
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Could not resolve '${args.objectName}'${typeSuffix} — no search hit matched.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  objectName: args.objectName,
                  objectType: target.type,
                  uri: target.uri,
                  packageName: (target as { packageName?: string }).packageName,
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
              text: `Find definition failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
