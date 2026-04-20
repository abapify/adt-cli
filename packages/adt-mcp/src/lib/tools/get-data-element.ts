/**
 * Tool: get_data_element – fetch DDIC data element metadata
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetDataElementTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_data_element',
    'Fetch DDIC data element metadata.',
    {
      ...sessionOrConnectionShape,
      dataElementName: z
        .string()
        .describe('Data element name (e.g. ZDTEL_SAMPLE)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const result = await client.adt.ddic.dataelements.get(
          args.dataElementName.toLowerCase(),
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
              text: `Get data element failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
