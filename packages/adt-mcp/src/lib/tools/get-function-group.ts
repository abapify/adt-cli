/**
 * Tool: get_function_group – read ABAP function group metadata and source
 *
 * Retrieves the function group metadata (description, includes) and
 * optionally the main include source code.
 *
 * ADT endpoint: /sap/bc/adt/functions/groups/{groupName}
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetFunctionGroupTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_function_group',
    'Read ABAP function group metadata (description, includes). Optionally includes source code.',
    {
      ...connectionShape,
      groupName: z
        .string()
        .describe('Function group name (e.g. ZFUGR_UTIL)'),
      includeSource: z
        .boolean()
        .optional()
        .describe('Whether to also return the main include source code (default: false)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.groupName.toLowerCase();

        const metadata = await client.adt.functions.groups.get(name);

        let source: string | undefined;
        if (args.includeSource) {
          source = (await client.adt.functions.groups.source.main.get(
            name,
          )) as string;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { metadata, ...(source !== undefined ? { source } : {}) },
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
              text: `Get function group failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
