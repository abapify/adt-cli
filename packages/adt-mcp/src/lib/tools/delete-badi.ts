/**
 * Tool: delete_badi – delete an Enhancement Implementation (ENHO/XHH)
 *
 * BAdI implementations are carried by the parent Enhancement
 * Implementation; deleting the ENHO removes them.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkBadi, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerDeleteBadiTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_badi',
    'Delete an Enhancement Implementation (ENHO/XHH — BAdI container).',
    {
      ...connectionShape,
      badiName: z.string().describe('Enhancement Implementation name'),
      transport: z.string().optional().describe('Transport request number'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client);

        await AdkBadi.delete(
          args.badiName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'deleted',
                  objectType: 'ENHO',
                  objectName: args.badiName.toUpperCase(),
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
              text: `Delete BAdI failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
