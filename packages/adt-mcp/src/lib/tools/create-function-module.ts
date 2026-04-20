/**
 * Tool: create_function_module – create a function module inside a group
 *
 * Thin MCP wrapper over `AdkFunctionModule.create()`, which POSTs through
 * the typed `client.adt.functions.groups.fmodules` contract.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AdkFunctionModule, initializeAdk } from '@abapify/adk';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerCreateFunctionModuleTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'create_function_module',
    'Create a new ABAP function module in a function group. Wraps the typed fmodules contract.',
    {
      ...sessionOrConnectionShape,
      groupName: z
        .string()
        .describe('Parent function group name (e.g. ZFG_UTIL)'),
      functionName: z.string().describe('Function module name (e.g. Z_MY_FM)'),
      description: z.string().describe('Short description'),
      processingType: z
        .enum(['normal', 'rfc', 'update', 'backgroundTask'])
        .optional()
        .describe('Processing type (default: normal)'),
      transport: z
        .string()
        .optional()
        .describe('Transport request number (for transportable objects)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        initializeAdk(client);

        const fm = await AdkFunctionModule.create(
          args.groupName,
          args.functionName,
          args.description,
          {
            transport: args.transport,
            processingType: args.processingType,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  groupName: fm.groupName,
                  functionName: fm.name,
                  description: fm.description,
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
              text: `Create function module failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
