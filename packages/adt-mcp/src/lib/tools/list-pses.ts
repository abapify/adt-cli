/**
 * MCP tool: `list_pses` – list SAP STRUST Personal Security Environments.
 *
 * Corresponds to CLI `adt strust list`.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerListPsesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'list_pses',
    'List SAP STRUST Personal Security Environments (identities).',
    {
      ...sessionOrConnectionShape,
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
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
