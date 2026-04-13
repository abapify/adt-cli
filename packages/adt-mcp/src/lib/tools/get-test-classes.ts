/**
 * Tool: get_test_classes – retrieve test classes defined in an ABAP class
 *
 * Fetches the test-classes include (FOR TESTING classes) for a given ABAP class.
 * Returns the raw ABAP source of the testclasses include so the AI can
 * enumerate all local test classes with their test methods.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';
import { connectionShape } from './shared-schemas.js';

export function registerGetTestClassesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_test_classes',
    'Get the test class definitions (FOR TESTING) embedded in an ABAP class',
    {
      ...connectionShape,
      className: z.string().describe('ABAP class name (e.g. ZCL_MY_CLASS)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = encodeURIComponent(args.className.toLowerCase());

        const source = await client.fetch(
          `/sap/bc/adt/oo/classes/${name}/includes/testclasses`,
          {
            method: 'GET',
            headers: { Accept: 'text/plain' },
          },
        );

        return {
          content: [{ type: 'text' as const, text: String(source) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Get test classes failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
