/**
 * Tools: get_function_group + get_function – ABAP function group and module access
 *
 * get_function_group: retrieve function group metadata and optionally source.
 * get_function: retrieve function module metadata and optionally source.
 *
 * ADT endpoints:
 *   GET /sap/bc/adt/functions/groups/{groupName}
 *   GET /sap/bc/adt/functions/groups/{groupName}/source/main
 *   GET /sap/bc/adt/functions/groups/{groupName}/fmodules/{fmName}
 *   GET /sap/bc/adt/functions/groups/{groupName}/fmodules/{fmName}/source/main
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

function formatMetadataResult(
  metadata: unknown,
  source: string | undefined,
): string {
  return JSON.stringify(
    source === undefined ? { metadata } : { metadata, source },
    null,
    2,
  );
}

export function registerGetFunctionGroupTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_function_group',
    'Read ABAP function group metadata (description, includes). Optionally includes source code.',
    {
      ...connectionShape,
      groupName: z.string().describe('Function group name (e.g. ZFUGR_UTIL)'),
      includeSource: z
        .boolean()
        .optional()
        .describe(
          'Whether to also return the main include source code (default: false)',
        ),
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
              text: formatMetadataResult(metadata, source),
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
          source = await client.adt.functions.groups.fmodules.source.main.get(
            groupName,
            fmName,
          );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatMetadataResult(metadata, source),
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
