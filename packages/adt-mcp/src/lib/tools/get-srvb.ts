/**
 * Tool: get_srvb – fetch RAP Service Binding metadata
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetSrvbTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'get_srvb',
    'Fetch RAP Service Binding (SRVB) metadata. SRVB has no source text; only the binding XML is returned.',
    {
      ...sessionOrConnectionShape,
      srvbName: z.string().describe('SRVB name (e.g. ZUI_MY_BINDING)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
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
