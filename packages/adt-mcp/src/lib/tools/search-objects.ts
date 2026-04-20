/**
 * Tool: search_objects – search ABAP objects in the repository
 *
 * CLI equivalent: `adt search <query>`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { extractObjectReferences } from './utils';

export function registerSearchObjectsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'search_objects',
    'Search for ABAP objects in the repository (supports wildcards)',
    {
      ...sessionOrConnectionShape,
      query: z.string().describe('Search query (supports wildcards like *)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const maxResults = args.maxResults ?? 50;

        const results =
          await client.adt.repository.informationsystem.search.quickSearch({
            query: args.query,
            maxResults,
          });

        const objects = extractObjectReferences(results);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ count: objects.length, objects }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
