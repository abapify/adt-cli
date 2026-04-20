/**
 * Tool: get_object – get details about a specific ABAP object
 *
 * CLI equivalent: `adt get <objectName>`
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { extractObjectReferences } from './utils';

export function registerGetObjectTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_object',
    'Get details about a specific ABAP object by name',
    {
      ...sessionOrConnectionShape,
      objectName: z.string().describe('ABAP object name to inspect'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        // Step 1: Search for the object
        const searchResult =
          await client.adt.repository.informationsystem.search.quickSearch({
            query: args.objectName,
            maxResults: 10,
          });

        const objects = extractObjectReferences(searchResult);

        // Find exact match
        const exactMatch = objects.find(
          (obj) =>
            String(obj.name ?? '').toUpperCase() ===
            args.objectName.toUpperCase(),
        );

        if (!exactMatch) {
          const similar = objects
            .filter((obj) =>
              String(obj.name ?? '')
                .toUpperCase()
                .includes(args.objectName.toUpperCase()),
            )
            .slice(0, 5);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    found: false,
                    message: `Object '${args.objectName}' not found`,
                    similar,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { found: true, object: exactMatch },
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
              text: `Get object failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
