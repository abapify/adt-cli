/**
 * Tool: get_function – read ABAP function module metadata and source
 *
 * Retrieves the function module metadata (signature, parameters, exceptions)
 * and optionally the source code.
 *
 * ADT endpoint: /sap/bc/adt/functions/groups/{groupName}/fmodules/{fmName}
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetFunctionTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_function',
    'Read ABAP function module metadata (parameters, exceptions) and optionally its source code.',
    {
      ...connectionShape,
      groupName: z.string().describe('Function group name (e.g. ZFUGR_UTIL)'),
      functionName: z
        .string()
        .describe('Function module name (e.g. Z_MY_FUNCTION)'),
      includeSource: z
        .boolean()
        .optional()
        .describe('Whether to also return the source code (default: false)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const groupName = args.groupName.toLowerCase();
        const fmName = args.functionName.toLowerCase();

        const metadata = await client.adt.functions.groups.fmodules.get(
          groupName,
          fmName,
        );

        let source: string | undefined;
        if (args.includeSource) {
          source = (await client.fetch(
            `/sap/bc/adt/functions/groups/${groupName}/fmodules/${fmName}/source/main`,
            { method: 'GET', headers: { Accept: 'text/plain' } },
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
              text: `Get function failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
