/**
 * Tool: create_function_group – create a new ABAP function group
 *
 * Thin MCP wrapper over `AdkFunctionGroup.create()`, which POSTs through
 * the typed `client.adt.functions.groups` contract.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkFunctionGroup, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerCreateFunctionGroupTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_function_group',
    'Create a new ABAP function group. Wraps the typed functions/groups contract.',
    {
      ...connectionShape,
      groupName: z
        .string()
        .describe('Function group name (uppercase, e.g. ZFG_UTIL)'),
      description: z.string().describe('Short description of the group'),
      packageName: z
        .string()
        .describe('Package to assign the function group to'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (for transportable objects)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client);

        const fugr = await AdkFunctionGroup.create(
          args.groupName,
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
                  groupName: fugr.name,
                  description: fugr.description,
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
              text: `Create function group failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
