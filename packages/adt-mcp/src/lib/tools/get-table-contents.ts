/**
 * Tool: get_table_contents – read table data with optional WHERE filter
 *
 * Uses the ADT data preview freestyle endpoint to execute a SELECT query
 * against a DDIC table and return the result as JSON.
 *
 * ADT endpoint: POST /sap/bc/adt/datapreview/freestyle
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerGetTableContentsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_table_contents',
    'Read data from a DDIC table with optional WHERE filter, column selection, and row limit. WARNING: the WHERE clause is sent as-is to the SAP data preview endpoint — avoid untrusted input.',
    {
      ...connectionShape,
      tableName: z.string().describe('DDIC table name (e.g. MARA, VBAK, T001)'),
      where: z
        .string()
        .optional()
        .describe('WHERE clause (ABAP SQL syntax, e.g. "MATNR LIKE \'Z%\'")'),
      columns: z
        .array(z.string())
        .optional()
        .describe(
          'Columns to select (default: all columns). Example: ["MATNR","MBRSH"]',
        ),
      maxRows: z
        .number()
        .optional()
        .describe('Maximum rows to return (default: 100)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const maxRows = args.maxRows ?? 100;

        const selectColumns =
          args.columns && args.columns.length > 0
            ? args.columns.join(', ')
            : '*';

        const whereClause = args.where ? ` WHERE ${args.where}` : '';
        const query = `SELECT ${selectColumns} FROM ${args.tableName.toUpperCase()}${whereClause}`;

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
            body: query,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { table: args.tableName.toUpperCase(), query, data: result },
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
              text: `Get table contents failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
