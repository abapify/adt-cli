/**
 * Tool: get_badi – fetch BAdI / Enhancement Implementation (ENHO/XHH)
 * metadata, optionally including the source payload that lists
 * the BAdI implementations.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetBadiTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'get_badi',
    'Fetch Enhancement Implementation (ENHO/XHH — BAdI container) metadata, optionally including the source payload with its BAdI implementations.',
    {
      ...sessionOrConnectionShape,
      badiName: z
        .string()
        .describe('Enhancement Implementation name (e.g. ZE_MY_BADI_IMPL)'),
      includeSource: z
        .boolean()
        .optional()
        .describe('Include source text listing the BAdI implementations'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const name = args.badiName.toLowerCase();
        const metadata = await client.adt.enhancements.enhoxhh.get(name);
        const result: Record<string, unknown> = { metadata };
        if (args.includeSource) {
          result.source =
            await client.adt.enhancements.enhoxhh.source.main.get(name);
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
              text: `Get BAdI failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
