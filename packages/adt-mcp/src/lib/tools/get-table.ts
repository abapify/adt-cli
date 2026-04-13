/**
 * Tool: get_table – read DDIC table or structure definition
 *
 * Fetches the table/structure metadata from the ADT DDIC tables endpoint.
 * Uses the existing adt-contracts tables contract for typed access.
 *
 * ADT endpoint: /sap/bc/adt/ddic/tables/{name}
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetTableTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'get_table',
    'Read DDIC table or structure definition (fields, keys, data elements)',
    {
      ...connectionShape,
      tableName: z.string().describe('DDIC table or structure name (e.g. MARA, VBAK)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.tableName.toLowerCase();

        const result = await client.adt.ddic.tables.get(name);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get table failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
