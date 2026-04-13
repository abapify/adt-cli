/**
 * Tool: cts_create_transport – create a new transport request
 *
 * CLI equivalent: `adt cts tr create`
 *
 * Uses the transportrequests.create() contract with the transportmanagmentCreate schema
 * to build and POST the XML request body.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';
import type { InferTypedSchema } from '@abapify/adt-schemas';
import { transportmanagmentCreate } from '@abapify/adt-schemas';

type CreateBody = InferTypedSchema<typeof transportmanagmentCreate>;

export function registerCtsCreateTransportTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'cts_create_transport',
    'Create a new transport request',
    {
      ...connectionShape,
      description: z.string().describe('Transport description'),
      type: z
        .enum(['K', 'W'])
        .optional()
        .describe(
          'Transport type: K (Workbench) or W (Customizing). Default: K',
        ),
      target: z.string().optional().describe('Target system'),
      project: z.string().optional().describe('CTS project name'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);

        const body: CreateBody = {
          root: {
            request: {
              desc: args.description,
              type: args.type ?? 'K',
              ...(args.target ? { target: args.target } : {}),
              ...(args.project ? { cts_project: args.project } : {}),
            },
          },
        };

        const response = await client.adt.cts.transportrequests.create(body);

        // Extract transport number from response
        const data = response as Record<string, unknown>;
        const request =
          (data.root as Record<string, unknown>)?.request ??
          data.request ??
          data;
        const trkorr =
          (request as Record<string, unknown>)?.trkorr ??
          (request as Record<string, unknown>)?.number ??
          '';

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  transport: String(trkorr),
                  description: args.description,
                  type: args.type ?? 'K',
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
              text: `Create transport failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
