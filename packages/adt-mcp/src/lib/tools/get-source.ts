/**
 * Tool: get_source – read ABAP source code for an object
 *
 * CLI equivalent: `adt get <objectName>` (source view)
 *
 * Fetches the main source code for a given ABAP object by name and type.
 * Supports CLAS, INTF, PROG, FUGR, and FUNC objects.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { resolveObjectSourceUrl } from './utils.js';

export function registerGetSourceTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_source',
    'Get the main ABAP source code for an object (CLAS, INTF, PROG, FUGR)',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name (e.g. ZCL_MY_CLASS)'),
      objectType: z
        .enum(['CLAS', 'INTF', 'PROG', 'FUGR'])
        .describe('ABAP object type'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const sourceUrl = resolveObjectSourceUrl(
          args.objectName,
          args.objectType,
        );

        const source = await client.fetch(sourceUrl, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text:
                typeof source === 'string' ? source : JSON.stringify(source),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get source failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
