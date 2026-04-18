/**
 * Tool: get_data_element – fetch DDIC data element metadata
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetDataElementTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_data_element',
    'Fetch DDIC data element metadata.',
    {
      ...connectionShape,
      dataElementName: z
        .string()
        .describe('Data element name (e.g. ZDTEL_SAMPLE)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
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
