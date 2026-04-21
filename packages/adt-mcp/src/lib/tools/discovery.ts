/**
 * Tool: discovery – discover available ADT services
 *
 * CLI equivalent: `adt discovery`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { extractDiscoveryWorkspaces } from './utils';

export function registerDiscoveryTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'discovery',
    'Discover available ADT services on a SAP system',
    {
      ...sessionOrConnectionShape,
      filter: z
        .string()
        .optional()
        .describe('Filter workspaces by title substring'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const discovery = await client.adt.discovery.getDiscovery();
        const workspaces = extractDiscoveryWorkspaces(discovery);

        // Apply optional filter
        if (args.filter) {
          const filtered = workspaces.filter((workspace) =>
            String(workspace.title ?? '')
              .toLowerCase()
              .includes(args.filter.toLowerCase()),
          );
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
            {
              type: 'text' as const,
              text: JSON.stringify({ workspaces }, null, 2),
            },
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
