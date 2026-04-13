/**
 * Tool: get_test_classes – list ABAP test classes for a class
 *
 * Fetches the testclasses include of an ABAP class to identify
 * local test class definitions (FOR TESTING).
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
    'Get the test classes (testclasses include) for an ABAP class',
    {
      ...connectionShape,
      className: z.string().describe('ABAP class name (e.g. ZCL_MY_CLASS)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const name = args.className.toLowerCase();

        // Fetch testclasses include source
        const testclassesUrl = `/sap/bc/adt/oo/classes/${name}/includes/testclasses`;

        const source = await client.fetch(testclassesUrl, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });

        const sourceText =
          typeof source === 'string' ? source : JSON.stringify(source);

        // Parse CLASS ... FOR TESTING definitions from the source
        const testClassPattern =
          /CLASS\s+(\w+)\s+DEFINITION\s+.*?FOR\s+TESTING/gi;
        const testClasses: string[] = [];
        let match: RegExpExecArray | null;

        while ((match = testClassPattern.exec(sourceText)) !== null) {
          testClasses.push(match[1].toUpperCase());
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  className: args.className.toUpperCase(),
                  testClassCount: testClasses.length,
                  testClasses,
                  testClassesSource: sourceText,
                },
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
              text: `Get test classes failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
