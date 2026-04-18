/**
 * Tool: get_structure – fetch DDIC structure metadata (+ optional source)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetStructureTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_structure',
    'Fetch DDIC structure metadata, optionally including the ABAP source.',
    {
      ...connectionShape,
      structureName: z
        .string()
        .describe('Structure name (e.g. ZSTRUCT_SAMPLE)'),
      includeSource: z
        .boolean()
        .optional()
        .describe('Include ABAP source definition'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.structureName.toLowerCase();
        const metadata = await client.adt.ddic.structures.get(name);
        const result: Record<string, unknown> = { metadata };
        if (args.includeSource) {
          result.source =
            await client.adt.ddic.structures.source.main.get(name);
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
              text: `Get structure failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
