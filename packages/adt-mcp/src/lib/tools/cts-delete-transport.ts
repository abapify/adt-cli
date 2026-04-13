/**
 * Tool: cts_delete_transport – delete a transport request
 *
 * CLI equivalent: `adt cts tr delete <transport>`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCtsDeleteTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_delete_transport',
    'Delete a transport request',
    {
      ...connectionShape,
      transport: z
        .string()
        .describe('Transport number to delete (e.g. S0DK900001)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        await client.services.transports.delete(args.transport);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { transport: args.transport, status: 'deleted' },
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
              text: `Delete transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
