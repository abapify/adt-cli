/**
 * Tool: get_include – fetch ABAP program include (PROG/I) metadata.
 *
 * Corresponds to CLI `adt include read <name>` (metadata) and mirrors the
 * shape of `get_domain`/`get_data_element`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetIncludeTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_include',
    'Fetch metadata for an ABAP program include (PROG/I).',
    {
      ...sessionOrConnectionShape,
      includeName: z
        .string()
        .describe('Include name (e.g. ZTEST_INCLUDE). Case-insensitive.'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const result = await client.adt.programs.includes.get(
          args.includeName.toLowerCase(),
        );
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
              text: `Get include failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
