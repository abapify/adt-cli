/**
 * Tool: grep_objects – regex search within a canonical list of ABAP objects
 *
 * Uses the ADT repository information system search endpoint with
 * userannotation=userwhere for source code content search.
 *
 * ADT endpoint: /sap/bc/adt/repository/informationsystem/search
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';

export function registerGrepObjectsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'grep_objects',
    'Regex search for a pattern within named ABAP object source code.',
    {
      ...sessionOrConnectionShape,
      pattern: z.string().describe('Search pattern (regex or literal string)'),
      objectUris: z.never().optional(),
      objects: z
        .array(
          z.object({
            objectName: z.string().describe('ABAP object name'),
            objectType: z.string().describe('Object type (e.g. CLAS, PROG)'),
          }),
        )
        .min(1, 'Provide at least one object')
        .describe('Objects to search within (resolved to URIs automatically)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const maxResults = args.maxResults ?? 50;

        // Resolve SAP-internal URIs from the canonical name/type pairs.
        const uris: string[] = [];
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
                text: 'Specify at least one resolvable object name/type pair',
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
