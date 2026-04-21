/**
 * Tool: create_bdef – create a new RAP Behavior Definition
 *
 * Thin dedicated tool complementing the generic `create_object` dispatch
 * (which also handles BDEF). Exposed separately so clients can discover
 * BDEF creation intent without guessing the object-type string.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkBehaviorDefinition, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCreateBdefTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_bdef',
    'Create a new RAP Behavior Definition (BDEF) object.',
    {
      ...sessionOrConnectionShape,
      bdefName: z
        .string()
        .describe('BDEF name (uppercase, e.g. ZBP_MY_ENTITY)'),
      description: z.string().describe('Short description'),
      packageName: z
        .string()
        .describe('ABAP package to assign the BDEF to (e.g. $TMP)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (required for transportable)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        await AdkBehaviorDefinition.create(
          args.bdefName,
          args.description,
          args.packageName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  objectType: 'BDEF',
                  objectName: args.bdefName.toUpperCase(),
                  description: args.description,
                  packageName: args.packageName.toUpperCase(),
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
              text: `Create BDEF failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
