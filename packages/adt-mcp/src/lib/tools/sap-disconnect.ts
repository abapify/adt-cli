/**
 * Tool: sap_disconnect — release the SAP ADT session bound to the
 * current MCP session.
 *
 * Idempotent — calling without an active registry entry returns success.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';

export function registerSapDisconnectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'sap_disconnect',
    'Close the SAP ADT session bound to the current MCP session (idempotent).',
    {},
    async (_args, extra) => {
      const mcpSessionId = extra?.sessionId;

      if (!mcpSessionId || !ctx.registry) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ ok: true, hadSession: false }, null, 2),
            },
          ],
        };
      }

      const existing = ctx.registry.get(mcpSessionId);
      if (!existing) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ ok: true, hadSession: false }, null, 2),
            },
          ],
        };
      }

      await ctx.registry.delete(mcpSessionId);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                ok: true,
                hadSession: true,
                mcpSessionId,
                systemId: existing.systemId,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
