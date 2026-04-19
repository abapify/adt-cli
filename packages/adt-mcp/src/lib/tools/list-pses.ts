/**
 * MCP tool: `list_pses` – list SAP STRUST Personal Security Environments.
 *
 * Corresponds to CLI `adt strust list`.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerListPsesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_pses',
    'List SAP STRUST Personal Security Environments (identities).',
    {
      ...connectionShape,
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const result = await client.adt.system.security.pses.list();
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
              text: `list_pses failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
