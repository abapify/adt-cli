/**
 * Tool: cts_get_transport – get transport request details
 *
 * CLI equivalent: `adt cts tr get <transport>`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCtsGetTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_get_transport',
    'Get details of a specific transport request',
    {
      ...connectionShape,
      transport: z.string().describe('Transport number (e.g. S0DK900001)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const transport = await client.services.transports.get(args.transport);

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(transport, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
