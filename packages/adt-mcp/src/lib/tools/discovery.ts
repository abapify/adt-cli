/**
 * Tool: discovery – discover available ADT services
 *
 * CLI equivalent: `adt discovery`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerDiscoveryTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'discovery',
    'Discover available ADT services on a SAP system',
    {
      ...connectionShape,
      filter: z
        .string()
        .optional()
        .describe('Filter workspaces by title substring'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const discovery = await client.adt.discovery.getDiscovery();

        const result = discovery as Record<string, unknown>;

        // Apply optional filter
        if (args.filter && result.workspaces) {
          const workspaces = Array.isArray(result.workspaces)
            ? result.workspaces
            : [result.workspaces];
          const filtered = workspaces.filter((ws: Record<string, unknown>) => {
            const title = typeof ws['title'] === 'string' ? ws['title'] : '';
            return title.toLowerCase().includes(args.filter!.toLowerCase());
          });
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(filtered, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Discovery failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
