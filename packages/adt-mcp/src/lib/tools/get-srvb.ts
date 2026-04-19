/**
 * Tool: get_srvb – fetch RAP Service Binding metadata
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetSrvbTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'get_srvb',
    'Fetch RAP Service Binding (SRVB) metadata. SRVB has no source text; only the binding XML is returned.',
    {
      ...connectionShape,
      srvbName: z.string().describe('SRVB name (e.g. ZUI_MY_BINDING)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.srvbName.toLowerCase();
        const metadata = await client.adt.businessservices.bindings.get(name);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ metadata }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get SRVB failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
