/**
 * Tool: get_cds_dcl – fetch CDS DCL source metadata (+ optional source)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetCdsDclTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_cds_dcl',
    'Fetch CDS DCL access control source (DCLS) metadata, optionally including the source code.',
    {
      ...connectionShape,
      dclName: z.string().describe('DCL source name (e.g. ZDCL_SAMPLE)'),
      includeSource: z.boolean().optional().describe('Include DCL source code'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.dclName.toLowerCase();
        const metadata = await client.adt.ddic.dcl.sources.get(name);
        const result: Record<string, unknown> = { metadata };
        if (args.includeSource) {
          result.source =
            await client.adt.ddic.dcl.sources.source.main.get(name);
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
              text: `Get CDS DCL failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
