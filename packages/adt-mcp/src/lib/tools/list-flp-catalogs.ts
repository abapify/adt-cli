/**
 * MCP tool: `list_flp_catalogs` — list Fiori Launchpad catalogs.
 *
 * Wraps `client.adt.flp.catalogs.list()` (Page Builder OData). Response
 * is normalised via `normalizeOdataFeed` to drop the OData envelope.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export function registerListFlpCatalogsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_flp_catalogs',
    'List Fiori Launchpad catalogs via the Page Builder OData service',
    { ...connectionShape },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.flp.catalogs.list();
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
              text: `list_flp_catalogs failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
