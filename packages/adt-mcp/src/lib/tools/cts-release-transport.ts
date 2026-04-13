/**
 * Tool: cts_release_transport – release a transport request
 *
 * CLI equivalent: `adt cts tr release <transport>`
 *
 * POSTs to /sap/bc/adt/cts/transportrequests/{trkorr}?_action=RELEASE
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCtsReleaseTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_release_transport',
    'Release a transport request',
    {
      ...connectionShape,
      transport: z
        .string()
        .describe('Transport number to release (e.g. S0DK900001)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        await client.fetch(
          `/sap/bc/adt/cts/transportrequests/${args.transport}?_action=RELEASE`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/vnd.sap.adt.transportorganizer.v1+xml',
              Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
            },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { status: 'released', transport: args.transport },
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
              text: `Release transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
