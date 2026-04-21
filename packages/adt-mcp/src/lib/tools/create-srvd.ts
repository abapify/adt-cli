/**
 * Tool: create_srvd – create a new RAP Service Definition
 *
 * Thin dedicated tool complementing the generic `create_object` dispatch
 * (which also handles SRVD). Exposed separately so clients can discover
 * SRVD creation intent without guessing the object-type string.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkServiceDefinition, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCreateSrvdTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_srvd',
    'Create a new RAP Service Definition (SRVD) object.',
    {
      ...sessionOrConnectionShape,
      srvdName: z
        .string()
        .describe('SRVD name (uppercase, e.g. ZUI_MY_SERVICE)'),
      description: z.string().describe('Short description'),
      packageName: z
        .string()
        .describe('ABAP package to assign the SRVD to (e.g. $TMP)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (required for transportable)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        await AdkServiceDefinition.create(
          args.srvdName,
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
                  objectType: 'SRVD',
                  objectName: args.srvdName.toUpperCase(),
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
              text: `Create SRVD failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
