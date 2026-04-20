/**
 * Tool: get_source – fetch ABAP source code for an object
 *
 * CLI equivalent: `adt source get <objectName>`
 *
 * Returns the raw ABAP source code for programs, classes, interfaces, etc.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';

export function registerGetSourceTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_source',
    'Fetch ABAP source code for an object (program, class, interface, etc.)',
    {
      ...sessionOrConnectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe(
          'Object type (e.g. PROG, CLAS, INTF). Speeds up URI resolution when known.',
        ),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        const objectUri = await resolveObjectUri(
          client,
          args.objectName,
          args.objectType,
        );
        if (!objectUri) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Object '${args.objectName}' not found`,
              },
            ],
          };
        }

        const source = await client.fetch(`${objectUri}/source/main`, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ source: String(source) }),
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
