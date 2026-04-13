/**
 * Tool: search_objects – search ABAP objects in the repository
 *
 * CLI equivalent: `adt search <query>`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { extractObjectReferences } from './utils';

export function registerSearchObjectsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'search_objects',
    'Search for ABAP objects in the repository (supports wildcards)',
    {
      ...connectionShape,
      query: z.string().describe('Search query (supports wildcards like *)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
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
