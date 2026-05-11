import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetShortDumpsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_short_dumps',
    'List ABAP runtime short dumps or fetch details for a specific dump id.',
    {
      ...sessionOrConnectionShape,
      id: z.string().optional().describe('Short dump id for details lookup'),
      user: z.string().optional().describe('Optional SAP user filter'),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum dumps to return'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const path = args.id
          ? `/sap/bc/adt/runtime/dumps/${encodeURIComponent(args.id)}`
          : `/sap/bc/adt/runtime/dumps${
              args.user || args.maxResults != null
                ? `?${new URLSearchParams({
                    ...(args.user ? { user: args.user } : {}),
                    ...(args.maxResults != null
                      ? { maxResults: String(args.maxResults) }
                      : {}),
                  }).toString()}`
                : ''
            }`;

        const result = await client.fetch(path, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get short dumps failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
