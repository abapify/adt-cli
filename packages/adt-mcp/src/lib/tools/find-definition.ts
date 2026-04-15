/**
 * Tool: find_definition – navigate to the definition of an ABAP symbol
 *
 * Uses the ADT navigation endpoint to resolve where a symbol (class, method,
 * data element, etc.) is defined.
 *
 * ADT endpoint: GET /sap/bc/adt/navigation/target
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerFindDefinitionTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'find_definition',
    'Navigate to the definition of an ABAP symbol (class, method, type, function module, etc.)',
    {
      ...connectionShape,
      objectName: z
        .string()
        .describe('Name of the symbol or object to navigate to'),
      objectType: z
        .string()
        .optional()
        .describe(
          'Object type to narrow the search (e.g. CLAS, PROG, DTEL, TABL)',
        ),
      parentObjectName: z
        .string()
        .optional()
        .describe(
          'Parent object name (e.g. class name when looking for a method)',
        ),
      parentObjectType: z
        .string()
        .optional()
        .describe('Parent object type (e.g. CLAS)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const params = new URLSearchParams({
          objectName: args.objectName,
        });

        if (args.objectType) params.set('objectType', args.objectType);
        if (args.parentObjectName) params.set('context', args.parentObjectName);
        if (args.parentObjectType)
          params.set('contextType', args.parentObjectType);

        const result = await client.fetch(
          `/sap/bc/adt/navigation/target?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        // If result is empty, try resolving via search
        if (!result) {
          const uri = await resolveObjectUri(
            client,
            args.objectName,
            args.objectType,
          );
          if (uri) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    { objectName: args.objectName, uri },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Find definition failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
