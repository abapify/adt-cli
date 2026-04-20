/**
 * MCP tool: `get_flp_tile` — fetch a single FLP tile (CHIP) by ID.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { normalizeOdataEntity } from '@abapify/adt-contracts';

export function registerGetFlpTileTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_flp_tile',
    'Get a single Fiori Launchpad tile (CHIP) by its full CHIP ID',
    {
      ...sessionOrConnectionShape,
      tileId: z
        .string()
        .describe('CHIP ID, e.g. X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const res = await client.adt.flp.tiles.get(args.tileId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(normalizeOdataEntity(res) ?? null, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `get_flp_tile failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
