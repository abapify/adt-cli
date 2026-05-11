import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';
import { resolveObjectUri } from './utils';

export function registerGetCompletionsTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_completions',
    'Get ABAP code-completion proposals at a specific cursor position.',
    {
      ...sessionOrConnectionShape,
      objectName: z.string().describe('ABAP object name'),
      objectType: z.string().describe('ABAP object type (e.g. CLAS, PROG)'),
      line: z.number().int().min(1).describe('1-based cursor line'),
      column: z.number().int().min(1).describe('1-based cursor column'),
      sourceCode: z
        .string()
        .optional()
        .describe('Optional source override; fetched from SAP if omitted'),
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

        const sourceCode =
          args.sourceCode ??
          String(
            await client.fetch(`${objectUri}/source/main`, {
              method: 'GET',
              headers: { Accept: 'text/plain' },
            }),
          );

        const query = new URLSearchParams({
          uri: objectUri,
          line: String(args.line),
          column: String(args.column),
        });

        const result = await client.fetch(
          `/sap/bc/adt/codeassistance/completion?${query.toString()}`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ source: sourceCode }),
          },
        );

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
              text: `Get completions failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
