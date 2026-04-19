/**
 * Tool: delete_function_module – delete a function module
 *
 * Thin MCP wrapper over `AdkFunctionModule.delete()`, which DELETEs through
 * the typed `client.adt.functions.groups.fmodules` contract.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkFunctionModule, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerDeleteFunctionModuleTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'delete_function_module',
    'Delete an ABAP function module. Requires both group name and module name.',
    {
      ...connectionShape,
      groupName: z
        .string()
        .describe('Parent function group name (e.g. ZFG_UTIL)'),
      functionName: z.string().describe('Function module name to delete'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (for transportable objects)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        initializeAdk(client);

        await AdkFunctionModule.delete(
          args.groupName,
          args.functionName,
          args.transport ? { transport: args.transport } : undefined,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'deleted',
                  groupName: args.groupName.toUpperCase(),
                  functionName: args.functionName.toUpperCase(),
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
              text: `Delete function module failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
