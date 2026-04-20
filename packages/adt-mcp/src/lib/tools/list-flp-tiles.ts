/**
 * MCP tool: `list_flp_tiles` — list Fiori Launchpad tiles (CHIPs).
 *
 * Optional `catalogId` argument restricts the listing to tiles bound to
 * a specific catalog (uses `client.adt.flp.catalogs.tiles(id)`).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { normalizeOdataFeed } from '@abapify/adt-contracts';

export function registerListFlpTilesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_flp_tiles',
    'List Fiori Launchpad tiles (CHIPs). Optional catalogId filter.',
    {
      ...sessionOrConnectionShape,
      catalogId: z
        .string()
        .optional()
        .describe('Restrict to tiles of a specific catalog'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const res = args.catalogId
          ? await client.adt.flp.catalogs.tiles(args.catalogId)
          : await client.adt.flp.tiles.list();
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
              text: `list_flp_tiles failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
