/**
 * Tool: get_srvd – fetch RAP Service Definition metadata (+ optional .asrvd source)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetSrvdTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'get_srvd',
    'Fetch RAP Service Definition (SRVD) metadata, optionally including the .asrvd source code.',
    {
      ...connectionShape,
      srvdName: z.string().describe('SRVD name (e.g. ZUI_MY_SERVICE)'),
      includeSource: z
        .boolean()
        .optional()
        .describe('Include the .asrvd source text'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.srvdName.toLowerCase();
        const metadata = await client.adt.ddic.srvd.sources.get(name);
        const result: Record<string, unknown> = { metadata };
        if (args.includeSource) {
          result.source =
            await client.adt.ddic.srvd.sources.source.main.get(name);
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
              text: `Get SRVD failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
