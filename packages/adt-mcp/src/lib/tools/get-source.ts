/**
 * Tool: get_source – fetch ABAP source code for an object
 *
 * CLI equivalent: `adt source get <objectName>`
 *
 * Returns the raw ABAP source code for programs, classes, interfaces, etc.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';
import { extractObjectReferences, resolveObjectUriFromType } from './utils.js';

export function registerGetSourceTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_source',
    'Fetch ABAP source code for an object (program, class, interface, etc.)',
    {
      ...connectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z
        .string()
        .optional()
        .describe(
          'Object type (e.g. PROG, CLAS, INTF). Speeds up URI resolution when known.',
        ),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        // Resolve object URI – prefer type-based resolution (faster, no extra round-trip)
        let objectUri: string | undefined = args.objectType
          ? resolveObjectUriFromType(args.objectType, args.objectName)
          : undefined;

        if (!objectUri) {
          const searchResult =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: args.objectName,
              maxResults: 10,
            });
          const objects = extractObjectReferences(searchResult);
          const match = objects.find(
            (o) =>
              String(o.name ?? '').toUpperCase() ===
              args.objectName.toUpperCase(),
          );
          if (!match?.uri) {
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
          objectUri = match.uri;
        }

        const source = await client.fetch(`${objectUri}/source/main`, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });

        return {
          content: [{ type: 'text' as const, text: String(source) }],
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
