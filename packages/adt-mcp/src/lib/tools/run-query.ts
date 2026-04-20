/**
 * Tool: run_query – execute a freestyle ABAP SQL query
 *
 * Uses the ADT data preview freestyle endpoint to execute an arbitrary
 * ABAP SQL SELECT query and return results as JSON.
 *
 * ADT endpoint: POST /sap/bc/adt/datapreview/freestyle
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerRunQueryTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'run_query',
    'Execute a freestyle ABAP SQL SELECT query and return results as JSON. Only SELECT statements are supported.',
    {
      ...sessionOrConnectionShape,
      query: z
        .string()
        .describe(
          'ABAP SQL SELECT statement (e.g. "SELECT * FROM T001 WHERE MANDT = \'100\'")',
        ),
      maxRows: z
        .number()
        .optional()
        .describe('Maximum rows to return (default: 100)'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});
        const maxRows = args.maxRows ?? 100;

        const trimmedQuery = args.query.trim();
        if (!trimmedQuery.toUpperCase().startsWith('SELECT')) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Only SELECT statements are supported by the data preview endpoint',
              },
            ],
          };
        }

        const params = new URLSearchParams({
          rowCount: String(maxRows),
          outputFormat: 'json',
        });

        const result = await client.fetch(
          `/sap/bc/adt/datapreview/freestyle?${params.toString()}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Accept: 'application/json',
            },
            body: trimmedQuery,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { query: trimmedQuery, data: result },
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
              text: `Run query failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
