/**
 * Tool: get_cds_ddl – fetch CDS DDL source metadata (+ optional source)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetCdsDdlTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_cds_ddl',
    'Fetch CDS DDL source (DDLS) metadata, optionally including the DDL source code.',
    {
      ...connectionShape,
      ddlName: z.string().describe('DDL source name (e.g. ZDDL_SAMPLE)'),
      includeSource: z.boolean().optional().describe('Include DDL source code'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.ddlName.toLowerCase();
        const metadata = await client.adt.ddic.ddl.sources.get(name);
        const result: Record<string, unknown> = { metadata };
        if (args.includeSource) {
          result.source =
            await client.adt.ddic.ddl.sources.source.main.get(name);
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
              text: `Get CDS DDL failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
