/**
 * Tool: get_bdef – fetch RAP Behavior Definition metadata (+ optional .abdl source)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetBdefTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'get_bdef',
    'Fetch RAP Behavior Definition (BDEF) metadata, optionally including the .abdl source code.',
    {
      ...connectionShape,
      bdefName: z.string().describe('BDEF name (e.g. ZBP_MY_ENTITY)'),
      includeSource: z
        .boolean()
        .optional()
        .describe('Include the .abdl source text'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.bdefName.toLowerCase();
        const metadata = await client.adt.bo.behaviordefinitions.get(name);
        const result: Record<string, unknown> = { metadata };
        if (args.includeSource) {
          result.source =
            await client.adt.bo.behaviordefinitions.source.main.get(name);
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
              text: `Get BDEF failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
