/**
 * MCP tool: `list_flp_groups` — list Fiori Launchpad groups / pages.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export function registerListFlpGroupsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_flp_groups',
    'List Fiori Launchpad groups (Page Builder "Pages") via OData',
    { ...sessionOrConnectionShape },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const res = await client.adt.flp.groups.list();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(normalizeOdataFeed(res), null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `list_flp_groups failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
