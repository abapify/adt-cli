/**
 * Tool: get_callers_of – find all callers of an ABAP method or function
 *
 * Uses the ADT repository information system callers endpoint to traverse
 * the call hierarchy upward (who calls this method/function).
 *
 * ADT endpoint: GET /sap/bc/adt/repository/informationsystem/callers
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import { resolveObjectUri } from './utils';

export function registerGetCallersOfTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_callers_of',
    'Find all callers (upward call hierarchy) of an ABAP method, function module, or subroutine',
    {
      ...connectionShape,
      objectName: z
        .string()
        .describe('Name of the ABAP object (class, function group, program)'),
      objectType: z
        .string()
        .optional()
        .describe('Object type (e.g. CLAS, FUGR, PROG)'),
      objectUri: z
        .string()
        .optional()
        .describe(
          'Direct ADT URI of the object (skips name resolution if provided)',
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default: 50)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const maxResults = args.maxResults ?? 50;

        let objectUri = args.objectUri;
        if (!objectUri) {
          objectUri = await resolveObjectUri(
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
        }

        const params = new URLSearchParams({
          objectUri,
          maxResults: String(maxResults),
        });

        const result = await client.fetch(
          `/sap/bc/adt/repository/informationsystem/callers?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { objectName: args.objectName, objectUri, callers: result },
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
              text: `Get callers failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
