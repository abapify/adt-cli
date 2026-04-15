/**
 * Tool: grep_objects – regex search within a list of ABAP object URIs
 *
 * Uses the ADT repository information system search endpoint with
 * userannotation=userwhere for source code content search.
 *
 * ADT endpoint: /sap/bc/adt/repository/informationsystem/search
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerGrepObjectsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'grep_objects',
    'Regex search for a pattern within ABAP object source code. Provide either a list of object URIs or name+type pairs to resolve them.',
    {
      ...connectionShape,
      pattern: z.string().describe('Search pattern (regex or literal string)'),
      objectUris: z
        .array(z.string())
        .optional()
        .describe(
          'List of ADT object URIs to search within (e.g. /sap/bc/adt/oo/classes/zcl_example)',
        ),
      objects: z
        .array(
          z.object({
            objectName: z.string().describe('ABAP object name'),
            objectType: z.string().describe('Object type (e.g. CLAS, PROG)'),
          }),
        )
        .optional()
        .describe('Objects to search within (resolved to URIs automatically)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const maxResults = args.maxResults ?? 50;

        // Resolve URIs from name/type pairs if provided (in parallel)
        const uris: string[] = args.objectUris ? [...args.objectUris] : [];
        if (args.objects && args.objects.length > 0) {
          const resolved = await Promise.all(
            args.objects.map((obj) =>
              resolveObjectUri(client, obj.objectName, obj.objectType),
            ),
          );
          for (const uri of resolved) {
            if (uri) uris.push(uri);
          }
        }

        if (uris.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Specify at least one valid object URI or resolvable object name/type pair',
              },
            ],
          };
        }

        // Build query parameters
        const params = new URLSearchParams({
          userannotation: 'userwhere',
          query: args.pattern,
          maxResults: String(maxResults),
        });

        // Add object URI references
        uris.forEach((uri, i) => {
          params.set(`objectReferences.${i}.uri`, uri);
        });

        const result = await client.fetch(
          `/sap/bc/adt/repository/informationsystem/search?${params.toString()}`,
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
                { pattern: args.pattern, results: result },
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
              text: `Grep objects failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
