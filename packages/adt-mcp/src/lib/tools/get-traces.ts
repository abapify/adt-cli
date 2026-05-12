import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';
import { resolveClient } from './session-helpers';

export function registerGetTracesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'get_traces',
    'List ABAP runtime traces or fetch trace details (hitlist/db accesses).',
    {
      ...sessionOrConnectionShape,
      action: z
        .enum(['list', 'hitlist', 'dbAccesses'])
        .default('list')
        .describe('Trace operation to execute'),
      id: z
        .string()
        .optional()
        .describe('Trace id for hitlist/dbAccesses actions'),
    },
    async (args, extra) => {
      try {
        const { client } = await resolveClient(ctx, args, extra ?? {});

        if (args.action !== 'list' && !args.id) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `id is required for action '${args.action}'`,
              },
            ],
          };
        }

        const traceId = args.id;
        let endpoint = '/sap/bc/adt/runtime/traces';
        if (args.action === 'hitlist') {
          endpoint = `/sap/bc/adt/runtime/traces/${encodeURIComponent(traceId ?? '')}/hitlist`;
        } else if (args.action === 'dbAccesses') {
          endpoint = `/sap/bc/adt/runtime/traces/${encodeURIComponent(traceId ?? '')}/dbaccesses`;
        }

        const result = await client.fetch(endpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  action: args.action,
                  id: args.id,
                  result,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const status =
          error instanceof Error && 'status' in error
            ? (error as { status?: number }).status
            : undefined;
        const message =
          status === 404
            ? 'Traces endpoint is not available on this system (BTP systems may not support /sap/bc/adt/runtime/traces)'
            : `Get traces failed: ${error instanceof Error ? error.message : String(error)}`;
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: message,
            },
          ],
        };
      }
    },
  );
}
