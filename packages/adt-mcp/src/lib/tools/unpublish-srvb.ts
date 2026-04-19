/**
 * Tool: unpublish_srvb – unpublish (deactivate) a RAP Service Binding
 *
 * Complements the legacy `publish_service_binding` tool by providing a
 * dedicated unpublish entry point routed through the typed contract
 * (DELETE {basePath}/{name}/publishedstates).
 *
 * The legacy `publish_service_binding` tool is retained for backward
 * compatibility and now delegates to the same typed contract.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkServiceBinding, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerUnpublishSrvbTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'unpublish_srvb',
    'Unpublish (deactivate) a RAP Service Binding (SRVB) so it is no longer exposed via the SAP Gateway.',
    {
      ...connectionShape,
      srvbName: z.string().describe('SRVB name'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client);
        await AdkServiceBinding.unpublish(args.srvbName);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'unpublished',
                  objectType: 'SRVB',
                  objectName: args.srvbName.toUpperCase(),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Unpublish SRVB failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
