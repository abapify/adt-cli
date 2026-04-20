/**
 * Tool: cts_list_transports – list transport requests
 *
 * CLI equivalent: `adt cts tr list`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCtsListTransportsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_list_transports',
    'List transport requests from the CTS',
    {
      ...sessionOrConnectionShape,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const transports = await client.services.transports.list();
        const maxResults = args.maxResults ?? 50;
        const display = transports.slice(0, maxResults);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { count: transports.length, transports: display },
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
              text: `List transports failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
