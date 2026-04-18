/**
 * Tool: delete_srvd – delete a RAP Service Definition
 *
 * Thin dedicated tool complementing the generic `delete_object` dispatch.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkServiceDefinition, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerDeleteSrvdTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_srvd',
    'Delete a RAP Service Definition (SRVD) object.',
    {
      ...connectionShape,
      srvdName: z.string().describe('SRVD name'),
      transport: z.string().optional().describe('Transport request number'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client);

        await AdkServiceDefinition.delete(
          args.srvdName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'deleted',
                  objectType: 'SRVD',
                  objectName: args.srvdName.toUpperCase(),
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
              text: `Delete SRVD failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
