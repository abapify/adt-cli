/**
 * Tool: delete_bdef – delete a RAP Behavior Definition
 *
 * Thin dedicated tool complementing the generic `delete_object` dispatch.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkBehaviorDefinition, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerDeleteBdefTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_bdef',
    'Delete a RAP Behavior Definition (BDEF) object.',
    {
      ...sessionOrConnectionShape,
      bdefName: z.string().describe('BDEF name'),
      transport: z.string().optional().describe('Transport request number'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        await AdkBehaviorDefinition.delete(
          args.bdefName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'deleted',
                  objectType: 'BDEF',
                  objectName: args.bdefName.toUpperCase(),
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
              text: `Delete BDEF failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
