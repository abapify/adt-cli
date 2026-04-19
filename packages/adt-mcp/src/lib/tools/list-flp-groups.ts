/**
 * MCP tool: `list_flp_groups` — list Fiori Launchpad groups / pages.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export function registerListFlpGroupsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_flp_groups',
    'List Fiori Launchpad groups (Page Builder "Pages") via OData',
    { ...connectionShape },
    async (args) => {
      try {
        const client = ctx.getClient(args);
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
