/**
 * Tool: find_references – find all usages (where-used) of an ABAP symbol
 *
 * Uses the ADT repository information system usages endpoint to find
 * all references to a given object or symbol.
 *
 * ADT endpoint: GET /sap/bc/adt/repository/informationsystem/usages
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerFindReferencesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'find_references',
    'Find all usages (where-used) of an ABAP object or symbol. Returns a list of locations where the object is referenced.',
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

        // Resolve the object URI
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

        const params = new URLSearchParams({
          objectUri,
          objectName: args.objectName,
          maxResults: String(maxResults),
        });
        if (args.objectType) params.set('objectType', args.objectType);

        const result = await client.fetch(
          `/sap/bc/adt/repository/informationsystem/usages?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { objectName: args.objectName, objectUri, results: result },
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
