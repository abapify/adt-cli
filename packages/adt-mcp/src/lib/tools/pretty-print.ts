/**
 * Tool: pretty_print – format ABAP source code via the SAP pretty-printer
 *
 * Sends source code to the SAP ADT pretty-printer and returns the formatted
 * version. Does not modify the object in the system.
 *
 * ADT endpoint: POST /sap/bc/adt/prettyprinter/prettifySource
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

export function registerPrettyPrintTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'pretty_print',
    'Format ABAP source code via the SAP pretty-printer. Returns the formatted code without modifying the object.',
    {
      ...connectionShape,
      sourceCode: z.string().describe('ABAP source code to format'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const result = await client.fetch(
          '/sap/bc/adt/prettyprinter/prettifySource',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Accept: 'text/plain',
            },
            body: args.sourceCode,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text:
                typeof result === 'string' ? result : JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Pretty print failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
