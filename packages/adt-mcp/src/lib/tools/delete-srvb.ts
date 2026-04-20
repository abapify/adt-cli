/**
 * Tool: delete_srvb – delete a RAP Service Binding
 *
 * Thin dedicated tool complementing the generic `delete_object` dispatch.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkServiceBinding, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerDeleteSrvbTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_srvb',
    'Delete a RAP Service Binding (SRVB) object.',
    {
      ...sessionOrConnectionShape,
      srvbName: z.string().describe('SRVB name'),
      transport: z.string().optional().describe('Transport request number'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        await AdkServiceBinding.delete(
          args.srvbName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'deleted',
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
              text: `Delete SRVB failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
